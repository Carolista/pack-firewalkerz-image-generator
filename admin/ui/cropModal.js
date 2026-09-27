import { focusFirst, trapFocus } from '../../src/ui/focusTrap.js';

const MAX_OUTPUT_SIZE = 1024;
const MAX_ZOOM = 6;
const KEY_PAN_STEP = 12;
const KEY_PAN_STEP_FINE = 2;
const KEY_ZOOM_STEP = 1.08;
const JPEG_QUALITY = 0.92;
const LINE_HEIGHT_PX = 16;
const ALPHA_TYPES = ['image/png', 'image/webp'];
const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const KEY_ROTATE_STEP = (5 * Math.PI) / 180;
// Pinches almost always carry incidental twist, so rotation waits for a clearly deliberate one.
const PINCH_ROTATE_THRESHOLD = (18 * Math.PI) / 180;
const SNAP_TOLERANCE = (3 * Math.PI) / 180;

export function createCropModal({
	overlay,
	viewport,
	canvas,
	zoomInput,
	rotateBtn,
	rotateHandle,
	status,
	cancelBtn,
	applyBtn,
}) {
	const modalEl = overlay.querySelector('.modal') ?? overlay;
	const ctx = canvas.getContext('2d');
	const pointers = new Map();

	let source = null;
	let sourceWidth = 0;
	let sourceHeight = 0;
	let sourceObjectUrl = null;
	let outputType = 'image/jpeg';
	let resolver = null;
	let releaseTrap = null;
	let previouslyFocusedEl = null;
	// Viewport edge length in CSS px; the crop region is always this square.
	let viewportSize = 0;
	// Source px -> CSS px at zoom 1, sized so the image covers the viewport when unrotated.
	let baseScale = 1;
	let zoom = 1;
	let angle = 0;
	// Source-space point framed at the centre of the crop square.
	let centerX = 0;
	let centerY = 0;
	let drawHandle = 0;
	let pinchTwistTotal = 0;
	let pinchRotationArmed = false;
	let handleAngleOffset = 0;
	let gestureLastRotation = 0;
	let gestureLastScale = 1;
	let gestureTwistTotal = 0;
	let gestureRotationArmed = false;

	const resizeObserver =
		typeof ResizeObserver === 'undefined'
			? null
			: new ResizeObserver(() => syncViewportSize());

	cancelBtn.addEventListener('click', () => close(null));
	applyBtn.addEventListener('click', applyCrop);
	rotateBtn.addEventListener('click', () => rotateBy(QUARTER_TURN));
	zoomInput.addEventListener('input', () => {
		applyZoom(Number(zoomInput.value), viewportSize / 2, viewportSize / 2);
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !overlay.hidden) close(null);
	});

	viewport.addEventListener('pointerdown', event => {
		if (!source) return;
		viewport.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.size === 2) resetPinchRotation();
		viewport.classList.add('is-panning');
		viewport.focus();
	});

	viewport.addEventListener('pointermove', event => {
		if (!source || !pointers.has(event.pointerId)) return;
		event.preventDefault();
		const wasPinching = pointers.size >= 2;
		const previousMidpoint = wasPinching ? pinchMidpoint() : null;
		const previousSpread = wasPinching ? pinchSpread() : 0;
		const previousTwist = wasPinching ? pinchTwist() : 0;
		const previous = pointers.get(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (!wasPinching) {
			pan(event.clientX - previous.x, event.clientY - previous.y);
			return;
		}
		const midpoint = pinchMidpoint();
		const spread = pinchSpread();
		const rect = viewport.getBoundingClientRect();
		const twistDelta = normalizeSignedAngle(pinchTwist() - previousTwist);
		pinchTwistTotal += twistDelta;
		if (Math.abs(pinchTwistTotal) > PINCH_ROTATE_THRESHOLD) {
			pinchRotationArmed = true;
		}
		const nextZoom =
			previousSpread > 0 && spread > 0
				? zoom * (spread / previousSpread)
				: zoom;
		applyTransform(
			angle + (pinchRotationArmed ? twistDelta : 0),
			nextZoom,
			previousMidpoint.x - rect.left,
			previousMidpoint.y - rect.top,
		);
		pan(midpoint.x - previousMidpoint.x, midpoint.y - previousMidpoint.y);
	});

	for (const type of ['pointerup', 'pointercancel']) {
		viewport.addEventListener(type, event => {
			pointers.delete(event.pointerId);
			if (viewport.hasPointerCapture?.(event.pointerId)) {
				viewport.releasePointerCapture(event.pointerId);
			}
			if (pointers.size < 2) {
				if (pinchRotationArmed) snapAngleIfClose();
				resetPinchRotation();
			}
			if (!pointers.size) viewport.classList.remove('is-panning');
		});
	}

	rotateHandle.addEventListener('pointerdown', event => {
		if (!source) return;
		event.preventDefault();
		// Keeps the viewport's own pan gesture from starting underneath the handle.
		event.stopPropagation();
		rotateHandle.setPointerCapture(event.pointerId);
		handleAngleOffset = angle - pointerAngleAt(event);
		rotateHandle.classList.add('is-rotating');
	});

	rotateHandle.addEventListener('pointermove', event => {
		if (!source || !rotateHandle.hasPointerCapture?.(event.pointerId)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		applyTransform(
			handleAngleOffset + pointerAngleAt(event),
			zoom,
			viewportSize / 2,
			viewportSize / 2,
		);
	});

	for (const type of ['pointerup', 'pointercancel']) {
		rotateHandle.addEventListener(type, event => {
			if (!rotateHandle.hasPointerCapture?.(event.pointerId)) return;
			event.stopPropagation();
			rotateHandle.releasePointerCapture(event.pointerId);
			rotateHandle.classList.remove('is-rotating');
			snapAngleIfClose();
		});
	}

	viewport.addEventListener(
		'wheel',
		event => {
			if (!source) return;
			event.preventDefault();
			const rect = viewport.getBoundingClientRect();
			// Trackpad pinch arrives as a ctrl-modified wheel event and needs a stronger response.
			const delta =
				event.deltaY * (event.deltaMode === 1 ? LINE_HEIGHT_PX : 1);
			const factor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002));
			applyZoom(
				zoom * factor,
				event.clientX - rect.left,
				event.clientY - rect.top,
			);
		},
		{ passive: false },
	);

	// WebKit-only trackpad gestures; these never fire in Chromium or Gecko.
	// Values are cumulative per gesture, but we apply deltas so a restarted gesture cannot jump.
	viewport.addEventListener('gesturestart', event => {
		if (!source) return;
		event.preventDefault();
		gestureLastRotation = event.rotation ?? 0;
		gestureLastScale = event.scale || 1;
		gestureTwistTotal = 0;
		gestureRotationArmed = false;
	});

	viewport.addEventListener('gesturechange', event => {
		if (!source) return;
		event.preventDefault();
		const rotation = event.rotation ?? 0;
		const scale = event.scale || gestureLastScale;
		const twistDelta = ((rotation - gestureLastRotation) * Math.PI) / 180;
		const scaleRatio = gestureLastScale > 0 ? scale / gestureLastScale : 1;
		gestureLastRotation = rotation;
		gestureLastScale = scale;

		gestureTwistTotal += twistDelta;
		if (Math.abs(gestureTwistTotal) > PINCH_ROTATE_THRESHOLD) {
			gestureRotationArmed = true;
		}
		const rect = viewport.getBoundingClientRect();
		applyTransform(
			angle + (gestureRotationArmed ? twistDelta : 0),
			Number.isFinite(scaleRatio) ? zoom * scaleRatio : zoom,
			event.clientX - rect.left,
			event.clientY - rect.top,
		);
	});

	viewport.addEventListener('gestureend', event => {
		if (!source) return;
		event.preventDefault();
		if (gestureRotationArmed) snapAngleIfClose();
		gestureTwistTotal = 0;
		gestureRotationArmed = false;
	});

	viewport.addEventListener('keydown', event => {
		if (!source) return;
		const step = event.shiftKey ? KEY_PAN_STEP_FINE : KEY_PAN_STEP;
		const center = viewportSize / 2;
		switch (event.key) {
			case 'ArrowLeft':
				pan(-step, 0);
				break;
			case 'ArrowRight':
				pan(step, 0);
				break;
			case 'ArrowUp':
				pan(0, -step);
				break;
			case 'ArrowDown':
				pan(0, step);
				break;
			case '+':
			case '=':
				applyZoom(zoom * KEY_ZOOM_STEP, center, center);
				break;
			case '-':
			case '_':
				applyZoom(zoom / KEY_ZOOM_STEP, center, center);
				break;
			case '[':
				rotateBy(-KEY_ROTATE_STEP);
				break;
			case ']':
				rotateBy(KEY_ROTATE_STEP);
				break;
			case '0':
				resetFraming();
				break;
			default:
				return;
		}
		event.preventDefault();
	});

	return {
		// Resolves with a square Blob, or null when the user cancels.
		async open(file) {
			if (!file) return null;
			await loadSource(file);
			outputType = ALPHA_TYPES.includes(file.type)
				? file.type
				: 'image/jpeg';
			status.textContent = '';
			applyBtn.disabled = false;
			cancelBtn.disabled = false;
			angle = 0;
			zoom = 1;
			centerX = sourceWidth / 2;
			centerY = sourceHeight / 2;
			viewportSize = 0;
			previouslyFocusedEl = document.activeElement;
			overlay.hidden = false;
			syncViewportSize();
			resizeObserver?.observe(viewport);
			releaseTrap = trapFocus(modalEl);
			focusFirst(modalEl);
			return new Promise(resolve => {
				resolver = resolve;
			});
		},
	};

	async function loadSource(file) {
		releaseSource();
		let decoded;
		try {
			decoded = await decodeImage(file);
		} catch {
			throw new Error('That image could not be read. Try another file.');
		}
		source = decoded.source;
		sourceWidth = decoded.width;
		sourceHeight = decoded.height;
		sourceObjectUrl = decoded.objectUrl;
		if (!sourceWidth || !sourceHeight) {
			releaseSource();
			throw new Error('That image could not be read. Try another file.');
		}
	}

	function releaseSource() {
		source?.close?.();
		if (sourceObjectUrl) URL.revokeObjectURL(sourceObjectUrl);
		source = null;
		sourceObjectUrl = null;
		sourceWidth = 0;
		sourceHeight = 0;
	}

	function pinchSpread() {
		const [a, b] = [...pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	function pinchMidpoint() {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	}

	function pinchTwist() {
		const [a, b] = [...pointers.values()];
		return Math.atan2(b.y - a.y, b.x - a.x);
	}

	// Angle from the viewport centre to the pointer, used by the rotation handle.
	function pointerAngleAt(event) {
		const rect = viewport.getBoundingClientRect();
		return Math.atan2(
			event.clientY - (rect.top + rect.height / 2),
			event.clientX - (rect.left + rect.width / 2),
		);
	}

	function resetPinchRotation() {
		pinchTwistTotal = 0;
		pinchRotationArmed = false;
	}

	function snapAngleIfClose() {
		const nearest = Math.round(angle / QUARTER_TURN) * QUARTER_TURN;
		if (Math.abs(normalizeSignedAngle(angle - nearest)) > SNAP_TOLERANCE) {
			return;
		}
		applyTransform(nearest, zoom, viewportSize / 2, viewportSize / 2);
	}

	// A square of side c rotated by angle spans c/2 * (|cos| + |sin|) on each axis,
	// so the image must be that much larger to keep the crop fully covered.
	function minZoomForAngle() {
		return Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
	}

	// Maps a viewport coordinate back to the source pixel currently drawn there.
	function sourcePointAt(viewportX, viewportY) {
		const scale = baseScale * zoom;
		const dx = viewportX - viewportSize / 2;
		const dy = viewportY - viewportSize / 2;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		return {
			x: centerX + (dx * cos + dy * sin) / scale,
			y: centerY + (-dx * sin + dy * cos) / scale,
		};
	}

	function pan(deltaX, deltaY) {
		const scale = baseScale * zoom;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		centerX -= (deltaX * cos + deltaY * sin) / scale;
		centerY -= (-deltaX * sin + deltaY * cos) / scale;
		clampCenter();
		scheduleDraw();
	}

	// Keeps the source pixel under (anchorX, anchorY) pinned while angle and scale change.
	function applyTransform(nextAngle, nextZoom, anchorX, anchorY) {
		if (!source || !viewportSize) return;
		const anchor = sourcePointAt(anchorX, anchorY);
		angle = normalizeAngle(nextAngle);
		if (Number.isFinite(nextZoom)) zoom = clampZoomValue(nextZoom);
		const scale = baseScale * zoom;
		const dx = anchorX - viewportSize / 2;
		const dy = anchorY - viewportSize / 2;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		centerX = anchor.x - (dx * cos + dy * sin) / scale;
		centerY = anchor.y - (-dx * sin + dy * cos) / scale;
		clampCenter();
		syncZoomInput();
		scheduleDraw();
	}

	function applyZoom(nextZoom, anchorX, anchorY) {
		applyTransform(angle, nextZoom, anchorX, anchorY);
	}

	function rotateBy(delta) {
		applyTransform(angle + delta, zoom, viewportSize / 2, viewportSize / 2);
	}

	function resetFraming() {
		angle = 0;
		zoom = 1;
		centerX = sourceWidth / 2;
		centerY = sourceHeight / 2;
		clampCenter();
		syncZoomInput();
		scheduleDraw();
	}

	function clampZoomValue(value) {
		return Math.min(MAX_ZOOM, Math.max(minZoomForAngle(), value));
	}

	function clampCenter() {
		if (!viewportSize) return;
		const halfSpan =
			(viewportSize / (baseScale * zoom) / 2) * minZoomForAngle();
		centerX = clampAxis(centerX, halfSpan, sourceWidth);
		centerY = clampAxis(centerY, halfSpan, sourceHeight);
	}

	function syncZoomInput() {
		zoomInput.min = String(minZoomForAngle());
		zoomInput.value = String(zoom);
	}

	function syncViewportSize() {
		if (!source) return;
		const rect = viewport.getBoundingClientRect();
		const size = Math.round(Math.min(rect.width, rect.height));
		if (!size || size === viewportSize) return;

		viewportSize = size;
		baseScale = size / Math.min(sourceWidth, sourceHeight);
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		canvas.width = Math.round(size * dpr);
		canvas.height = Math.round(size * dpr);

		zoom = clampZoomValue(zoom);
		clampCenter();
		syncZoomInput();
		scheduleDraw();
	}

	function scheduleDraw() {
		if (drawHandle) return;
		drawHandle = requestAnimationFrame(() => {
			drawHandle = 0;
			draw();
		});
	}

	function draw() {
		if (!source || !viewportSize) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		paintFramedImage(ctx, canvas.width);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	// Draws the image so the framed square exactly fills a square target of the given size.
	function paintFramedImage(targetCtx, targetSize) {
		const scale = (baseScale * zoom * targetSize) / viewportSize;
		targetCtx.translate(targetSize / 2, targetSize / 2);
		targetCtx.rotate(angle);
		targetCtx.scale(scale, scale);
		targetCtx.translate(-centerX, -centerY);
		targetCtx.drawImage(source, 0, 0);
	}

	async function applyCrop() {
		if (!source) return;
		applyBtn.disabled = true;
		cancelBtn.disabled = true;
		status.textContent = 'Preparing image...';
		try {
			const blob = await renderOutput();
			close(blob);
		} catch (error) {
			status.textContent = error.message;
			applyBtn.disabled = false;
			cancelBtn.disabled = false;
		}
	}

	async function renderOutput() {
		const cropSourceSize = viewportSize / (baseScale * zoom);
		const outputSize = Math.max(
			1,
			Math.min(MAX_OUTPUT_SIZE, Math.round(cropSourceSize)),
		);
		const output = document.createElement('canvas');
		output.width = outputSize;
		output.height = outputSize;
		const outputCtx = output.getContext('2d');
		outputCtx.imageSmoothingEnabled = true;
		outputCtx.imageSmoothingQuality = 'high';
		// JPEG has no alpha channel, so transparent source pixels would otherwise render black.
		if (outputType === 'image/jpeg') {
			outputCtx.fillStyle = '#ffffff';
			outputCtx.fillRect(0, 0, outputSize, outputSize);
		}
		paintFramedImage(outputCtx, outputSize);
		const blob = await new Promise(resolve => {
			output.toBlob(resolve, outputType, JPEG_QUALITY);
		});
		if (!blob) throw new Error('The cropped image could not be created.');
		return blob;
	}

	function close(value) {
		if (drawHandle) {
			cancelAnimationFrame(drawHandle);
			drawHandle = 0;
		}
		resizeObserver?.unobserve(viewport);
		pointers.clear();
		viewport.classList.remove('is-panning');
		overlay.hidden = true;
		releaseTrap?.();
		releaseTrap = null;
		releaseSource();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		previouslyFocusedEl?.focus();
		previouslyFocusedEl = null;
		resolver?.(value);
		resolver = null;
	}
}

// Falls back to centring when the image is too small to satisfy the inset on this axis.
function clampAxis(value, halfSpan, extent) {
	if (halfSpan * 2 >= extent) return extent / 2;
	return Math.max(halfSpan, Math.min(extent - halfSpan, value));
}

function normalizeAngle(value) {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

// Maps an angle into [-PI, PI] so twist deltas never jump a full turn at the seam.
function normalizeSignedAngle(value) {
	const normalized = normalizeAngle(value);
	return normalized > Math.PI ? normalized - FULL_TURN : normalized;
}

// Prefers createImageBitmap so EXIF rotation is baked in before any measurement happens.
async function decodeImage(file) {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file, {
				imageOrientation: 'from-image',
			});
			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				objectUrl: null,
			};
		} catch {
			// Older engines reject the options argument; fall through to the element decoder.
		}
	}
	const objectUrl = URL.createObjectURL(file);
	try {
		const image = await loadImageElement(objectUrl);
		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
			objectUrl,
		};
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}

function loadImageElement(objectUrl) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.decoding = 'async';
		image.addEventListener('load', () => resolve(image), { once: true });
		image.addEventListener(
			'error',
			() => reject(new Error('The image could not be decoded.')),
			{ once: true },
		);
		image.src = objectUrl;
	});
}
