import { canShareFile } from '../services/share.js';

let statusEl;
let imageEl;
let placeholderEl;
let shareBtnEl;
let retryBtnEl;
let imageRequestId = 0;

export function initGenerationOutput({
	status,
	image,
	placeholder,
	shareBtn,
	retryBtn,
}) {
	statusEl = status;
	imageEl = image;
	placeholderEl = placeholder;
	shareBtnEl = shareBtn;
	retryBtnEl = retryBtn;
}

export function showGenerating() {
	imageRequestId += 1;
	imageEl.onload = null;
	imageEl.onerror = null;
	statusEl.innerText =
		'Generating image (this will take about 5-10 seconds)...';
	imageEl.style.display = 'none';
	placeholderEl.hidden = false;
	shareBtnEl.style.display = 'none';
	retryBtnEl.style.display = 'none';
	placeholderEl
		.closest('.card')
		.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function showSuccess({ imageUrl, blob }) {
	const requestId = ++imageRequestId;
	imageEl.onload = () => {
		if (requestId !== imageRequestId) return;
		placeholderEl.hidden = true;
		imageEl.style.display = 'block';
		statusEl.innerText = 'Done!';

		if (canShareFile(blob, 'scene.jpg', 'image/jpeg')) {
			shareBtnEl.style.display = 'inline-block';
		}
	};
	imageEl.onerror = () => {
		if (requestId !== imageRequestId) return;
		placeholderEl.hidden = true;
		imageEl.style.display = 'none';
		showError('The generated image could not be displayed.');
	};
	imageEl.src = imageUrl;

	return blob;
}

export function showEmptyResponse(raw) {
	statusEl.innerText =
		'Response received, but no inline image data was returned.';
	console.log('Response payload:', raw);
}

export function showError(message) {
	placeholderEl.hidden = true;
	imageEl.style.display = 'none';
	statusEl.innerText = `Error: ${message}`;
	retryBtnEl.style.display = 'inline-block';
}

export function resetOutput() {
	imageRequestId += 1;
	imageEl.onload = null;
	imageEl.onerror = null;
	imageEl.src = '';
	imageEl.style.display = 'none';
	placeholderEl.hidden = true;
	shareBtnEl.style.display = 'none';
	retryBtnEl.style.display = 'none';
	statusEl.innerText = 'Waiting for prompt...';
}
