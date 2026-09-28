import { trapFocus } from './focusTrap.js';

export function initSignInModal({ overlay, closeBtn, form, status }) {
	const modal = overlay.querySelector('.modal');
	let releaseFocusTrap;
	let previouslyFocused;
	let busy = false;

	function close() {
		if (busy || overlay.hidden) return;
		overlay.hidden = true;
		document.body.classList.remove('modal-open');
		releaseFocusTrap?.();
		releaseFocusTrap = null;
		form.reset();
		status.textContent = '';
		previouslyFocused?.focus();
	}

	closeBtn.addEventListener('click', close);
	overlay.addEventListener('click', event => {
		if (event.target === overlay) close();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !overlay.hidden) close();
	});

	return {
		open() {
			previouslyFocused = document.activeElement;
			status.textContent = '';
			overlay.hidden = false;
			document.body.classList.add('modal-open');
			releaseFocusTrap = trapFocus(modal);
			form.querySelector('input').focus();
		},
		setBusy(value) {
			busy = value;
			closeBtn.disabled = value;
			for (const control of form.querySelectorAll('input, button')) {
				control.disabled = value;
			}
		},
		setStatus(message) {
			status.textContent = message;
		},
	};
}
