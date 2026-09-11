import { focusFirst, trapFocus } from '../../src/ui/focusTrap.js';

export function createModalController({
	reauthOverlay,
	reauthForm,
	reauthStatus,
	confirmOverlay,
	confirmHeading,
	confirmMessage,
	confirmCancelBtn,
	confirmExtraBtn,
	confirmConfirmBtn,
	onReauthenticate,
}) {
	const reauthModalEl =
		reauthOverlay.querySelector('.modal') ?? reauthOverlay;
	const confirmModalEl =
		confirmOverlay.querySelector('.modal') ?? confirmOverlay;
	let confirmResolver;
	let extraHandler;
	let releaseConfirmTrap;
	let releaseReauthTrap;
	let previouslyFocusedConfirmEl;
	let previouslyFocusedReauthEl;

	reauthForm.addEventListener('submit', onReauthenticate);
	confirmCancelBtn.addEventListener('click', () =>
		resolveConfirmation(false),
	);
	confirmConfirmBtn.addEventListener('click', () =>
		resolveConfirmation(true),
	);
	// Runs the caller's callback without resolving, so Cancel/Confirm remain available afterward.
	confirmExtraBtn.addEventListener('click', () => extraHandler?.());
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape' && !confirmOverlay.hidden)
			resolveConfirmation(false);
	});

	return {
		showReauthentication() {
			previouslyFocusedReauthEl = document.activeElement;
			reauthOverlay.hidden = false;
			releaseReauthTrap = trapFocus(reauthModalEl);
			focusFirst(reauthModalEl);
		},
		getReauthenticationStatusElement() {
			return reauthStatus;
		},
		showConfirmation(
			heading,
			message,
			{
				cancelLabel = 'Cancel',
				confirmLabel = 'Delete',
				extraLabel,
				onExtra,
			} = {},
		) {
			confirmHeading.textContent = heading;
			confirmMessage.textContent = message;
			confirmCancelBtn.textContent = cancelLabel;
			confirmConfirmBtn.textContent = confirmLabel;
			extraHandler = extraLabel ? onExtra : null;
			confirmExtraBtn.hidden = !extraLabel;
			confirmExtraBtn.textContent = extraLabel ?? '';
			previouslyFocusedConfirmEl = document.activeElement;
			confirmOverlay.hidden = false;
			releaseConfirmTrap = trapFocus(confirmModalEl);
			focusFirst(confirmModalEl);
			return new Promise(resolve => {
				confirmResolver = resolve;
			});
		},
		setConfirmBusy(isBusy) {
			confirmConfirmBtn.disabled = isBusy;
			confirmConfirmBtn.textContent = isBusy ? 'Deleting...' : 'Delete';
		},
		completeReauthentication() {
			reauthOverlay.hidden = true;
			releaseReauthTrap?.();
			releaseReauthTrap = null;
			previouslyFocusedReauthEl?.focus();
		},
	};

	function resolveConfirmation(value) {
		confirmOverlay.hidden = true;
		releaseConfirmTrap?.();
		releaseConfirmTrap = null;
		previouslyFocusedConfirmEl?.focus();
		confirmResolver?.(value);
		confirmResolver = null;
		extraHandler = null;
	}
}
