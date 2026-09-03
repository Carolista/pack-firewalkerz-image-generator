export function setGenerationBusy({ generateBtn, retryBtn }, isBusy) {
	generateBtn.disabled = isBusy;
	retryBtn.disabled = isBusy;
	if (isBusy) retryBtn.style.display = 'none';
}
