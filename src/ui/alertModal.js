let overlayEl;
let messageEl;
let resolveShown;

export function initAlertModal({
	overlay,
	closeBtn,
	messageEl: message,
	okBtn,
}) {
	overlayEl = overlay;
	messageEl = message;

	const dismiss = () => {
		overlayEl.hidden = true;
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
	overlayEl.hidden = false;
	return new Promise(resolve => {
		resolveShown = resolve;
	});
}
