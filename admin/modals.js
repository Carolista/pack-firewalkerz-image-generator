export function createModalController({
	reauthOverlay,
	reauthForm,
	reauthStatus,
	confirmOverlay,
	confirmHeading,
	confirmMessage,
	confirmCancelBtn,
	confirmConfirmBtn,
	onReauthenticate,
}) {
	let confirmResolver;

	reauthForm.addEventListener('submit', onReauthenticate);
	confirmCancelBtn.addEventListener('click', () =>
		resolveConfirmation(false),
	);
	confirmConfirmBtn.addEventListener('click', () =>
		resolveConfirmation(true),
	);

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
			{ cancelLabel = 'Cancel', confirmLabel = 'Delete' } = {},
		) {
			confirmHeading.textContent = heading;
			confirmMessage.textContent = message;
			confirmCancelBtn.textContent = cancelLabel;
			confirmConfirmBtn.textContent = confirmLabel;
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
	}
}
