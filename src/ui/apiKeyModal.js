import { getApiKey, setApiKeyIfChanged } from '../services/storage.js';

const MESSAGES = {
	initial: 'Enter your Gemini API key to generate images.',
	invalid: 'That API key was rejected. Please enter a valid Gemini API key.',
};

let overlayEl;
let closeBtnEl;
let inputEl;
let submitBtnEl;
let messageEl;
let pendingResolve = null;

export function initApiKeyModal({
	overlay,
	closeBtn,
	input,
	submitBtn,
	messageEl: message,
}) {
	overlayEl = overlay;
	closeBtnEl = closeBtn;
	inputEl = input;
	submitBtnEl = submitBtn;
	messageEl = message;

	closeBtnEl.addEventListener('click', () => closeModal(null));
	overlayEl.addEventListener('click', event => {
		if (event.target === overlayEl) closeModal(null);
	});
	submitBtnEl.addEventListener('click', () => {
		const value = inputEl.value.trim();
		if (!value) return;
		setApiKeyIfChanged(value);
		closeModal(value);
	});
}

export function requestApiKey({ invalid = false } = {}) {
	messageEl.textContent = invalid ? MESSAGES.invalid : MESSAGES.initial;
	inputEl.value = getApiKey() ?? '';
	overlayEl.hidden = false;
	inputEl.focus();

	return new Promise(resolve => {
		pendingResolve = resolve;
	});
}

function closeModal(result) {
	overlayEl.hidden = true;
	if (pendingResolve) {
		pendingResolve(result);
		pendingResolve = null;
	}
}
