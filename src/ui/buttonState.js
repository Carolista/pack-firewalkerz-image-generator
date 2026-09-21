export function setGenerationBusy(
	{ generateBtn, retryBtn, controls = [] },
	isBusy,
) {
	for (const control of new Set([generateBtn, retryBtn, ...controls])) {
		control.disabled = isBusy;
	}
	if (isBusy) retryBtn.style.display = 'none';
}
