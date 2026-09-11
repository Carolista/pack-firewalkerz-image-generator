import { focusFirst, trapFocus } from './focusTrap.js';

let overlayEl;
let modalEl;
let messageEl;
let resolveShown;
let releaseFocusTrap;
let previouslyFocusedEl;

export function initAlertModal({
	overlay,
	closeBtn,
	messageEl: message,
	okBtn,
}) {
	overlayEl = overlay;
	modalEl = overlay.querySelector('.modal') ?? overlay;
	messageEl = message;

	const dismiss = () => {
		overlayEl.hidden = true;
		releaseFocusTrap?.();
		releaseFocusTrap = null;
		previouslyFocusedEl?.focus();
		resolveShown?.();
		resolveShown = null;
	};

	closeBtn.addEventListener('click', dismiss);
	okBtn.addEventListener('click', dismiss);
	overlayEl.addEventListener('click', e => {
		if (e.target === overlayEl) dismiss();
	});
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && !overlayEl.hidden) dismiss();
	});
}

export function showAlert(message) {
	messageEl.textContent = message;
	previouslyFocusedEl = document.activeElement;
	overlayEl.hidden = false;
	releaseFocusTrap = trapFocus(modalEl);
	focusFirst(modalEl);
	return new Promise(resolve => {
		resolveShown = resolve;
	});
}
