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

let imageShareSupport;

// Lets callers decide whether to render Share controls before any real blob exists.
export function supportsImageSharing() {
	imageShareSupport ??= canShareFile(
		new File([new Uint8Array(1)], 'probe.jpg', { type: 'image/jpeg' }),
	);
	return imageShareSupport;
}

export async function fetchShareBlob(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Could not load the image to share.');
	return response.blob();
}

export async function shareFile(file, { title, text }) {
	try {
		await navigator.share({ title, text, files: [file] });
	} catch (err) {
		if (err.name === 'AbortError') return;
		console.error('Share failed:', err);
	}
}
