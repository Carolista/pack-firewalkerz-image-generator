const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
	return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
		el => el.offsetParent !== null,
	);
}

// Cycles Tab/Shift+Tab within the container while active. Returns a cleanup function.
export function trapFocus(container) {
	function handleKeydown(event) {
		if (event.key !== 'Tab') return;
		const focusable = getFocusable(container);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
	document.addEventListener('keydown', handleKeydown);
	return () => document.removeEventListener('keydown', handleKeydown);
}

export function focusFirst(container) {
	getFocusable(container)[0]?.focus();
}
