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
	let confirmResolver;
	let extraHandler;

	reauthForm.addEventListener('submit', onReauthenticate);
	confirmCancelBtn.addEventListener('click', () =>
		resolveConfirmation(false),
	);
	confirmConfirmBtn.addEventListener('click', () =>
		resolveConfirmation(true),
	);
	// Runs the caller's callback without resolving, so Cancel/Confirm remain available afterward.
	confirmExtraBtn.addEventListener('click', () => extraHandler?.());

	return {
		showReauthentication() {
			reauthOverlay.hidden = false;
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
			confirmOverlay.hidden = false;
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
		},
	};

	function resolveConfirmation(value) {
		confirmOverlay.hidden = true;
		confirmResolver?.(value);
		confirmResolver = null;
		extraHandler = null;
	}
}
