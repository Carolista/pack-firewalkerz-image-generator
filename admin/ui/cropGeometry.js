const FULL_TURN = Math.PI * 2;

export function normalizeAngle(value) {
	return ((value % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function normalizeSignedAngle(value) {
	const normalized = normalizeAngle(value);
	return normalized > Math.PI ? normalized - FULL_TURN : normalized;
}

export function minZoomForAngle(angle) {
	return Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
}

export function clampAxis(value, halfSpan, extent) {
	if (halfSpan * 2 >= extent) return extent / 2;
	return Math.max(halfSpan, Math.min(extent - halfSpan, value));
}

export function sourcePointAt(viewportX, viewportY, state) {
	const scale = state.baseScale * state.zoom;
	const dx = viewportX - state.viewportSize / 2;
	const dy = viewportY - state.viewportSize / 2;
	const cos = Math.cos(state.angle);
	const sin = Math.sin(state.angle);
	return {
		x: state.centerX + (dx * cos + dy * sin) / scale,
		y: state.centerY + (-dx * sin + dy * cos) / scale,
	};
}

export function clampCenter(state) {
	if (!state.viewportSize) {
		return { centerX: state.centerX, centerY: state.centerY };
	}
	const halfSpan =
		(state.viewportSize / (state.baseScale * state.zoom) / 2) *
		minZoomForAngle(state.angle);
	return {
		centerX: clampAxis(state.centerX, halfSpan, state.sourceWidth),
		centerY: clampAxis(state.centerY, halfSpan, state.sourceHeight),
	};
}

export function transformAroundAnchor(
	state,
	nextAngle,
	nextZoom,
	anchorX,
	anchorY,
	maxZoom,
) {
	const anchor = sourcePointAt(anchorX, anchorY, state);
	const angle = normalizeAngle(nextAngle);
	const zoom = Number.isFinite(nextZoom)
		? Math.min(maxZoom, Math.max(minZoomForAngle(angle), nextZoom))
		: state.zoom;
	const scale = state.baseScale * zoom;
	const dx = anchorX - state.viewportSize / 2;
	const dy = anchorY - state.viewportSize / 2;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return {
		angle,
		zoom,
		...clampCenter({
			...state,
			angle,
			zoom,
			centerX: anchor.x - (dx * cos + dy * sin) / scale,
			centerY: anchor.y - (-dx * sin + dy * cos) / scale,
		}),
	};
}
