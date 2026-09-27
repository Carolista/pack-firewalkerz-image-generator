import { filenameForBlob } from './download.js';

export function createShareFile(blob, baseName) {
	const mimeType = blob.type || 'image/jpeg';
	return new File([blob], filenameForBlob(blob, baseName), {
		type: mimeType,
	});
}

export function canShareFile(file) {
	if (typeof navigator.canShare !== 'function') return false;
	try {
		return navigator.canShare({ files: [file] });
	} catch {
		return false;
	}
}

// Temporary: surfaces why sharing is unavailable on devices we cannot test directly.
export function describeShareSupport(file) {
	let filesResult = 'n/a';
	if (typeof navigator.canShare === 'function') {
		try {
			filesResult = String(navigator.canShare({ files: [file] }));
		} catch (err) {
			filesResult = `threw ${err.name}`;
		}
	}
	return [
		`secure:${window.isSecureContext}`,
		`share:${typeof navigator.share}`,
		`canShare:${typeof navigator.canShare}`,
		`files:${filesResult}`,
		`type:${file.type || 'none'}`,
	].join('  ');
}

export async function shareFile(file, { title, text }) {
	try {
		await navigator.share({ title, text, files: [file] });
	} catch (err) {
		if (err.name === 'AbortError') return;
		console.error('Share failed:', err);
	}
}
