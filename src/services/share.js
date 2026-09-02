export function canShareFile(blob, filename, mimeType) {
	return Boolean(
		navigator.canShare &&
		navigator.canShare({
			files: [new File([blob], filename, { type: mimeType })],
		}),
	);
}

export async function shareFile(blob, { filename, mimeType, title, text }) {
	const file = new File([blob], filename, { type: mimeType });
	try {
		await navigator.share({ title, text, files: [file] });
	} catch (err) {
		console.log('Share canceled or failed:', err);
	}
}
