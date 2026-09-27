const EXTENSIONS = {
	'image/png': 'png',
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
};

export function filenameForBlob(blob, baseName) {
	return `${baseName}.${EXTENSIONS[blob.type] ?? 'jpg'}`;
}

// In-app webviews accept the click but never produce a file, so failure here is silent by nature.
export function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
