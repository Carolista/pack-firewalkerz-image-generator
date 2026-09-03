import { canShareFile } from '../services/share.js';

let statusEl;
let imageEl;
let shareBtnEl;
let retryBtnEl;

export function initGenerationOutput({ status, image, shareBtn, retryBtn }) {
	statusEl = status;
	imageEl = image;
	shareBtnEl = shareBtn;
	retryBtnEl = retryBtn;
}

export function showGenerating() {
	statusEl.innerText =
		'Generating image (this will take about 5-10 seconds)...';
	imageEl.style.display = 'none';
	shareBtnEl.style.display = 'none';
	retryBtnEl.style.display = 'none';
}

export function showSuccess({ imageUrl, blob }) {
	imageEl.src = imageUrl;
	imageEl.style.display = 'block';
	statusEl.innerText = 'Done!';

	if (canShareFile(blob, 'scene.jpg', 'image/jpeg')) {
		shareBtnEl.style.display = 'inline-block';
	}

	return blob;
}

export function showEmptyResponse(raw) {
	statusEl.innerText =
		'Response received, but no inline image data was returned.';
	console.log('Response payload:', raw);
}

export function showError(message) {
	statusEl.innerText = `Error: ${message}`;
	retryBtnEl.style.display = 'inline-block';
}

export function resetOutput() {
	imageEl.src = '';
	imageEl.style.display = 'none';
	shareBtnEl.style.display = 'none';
	retryBtnEl.style.display = 'none';
	statusEl.innerText = 'Waiting for prompt...';
}
