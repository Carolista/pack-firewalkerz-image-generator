import { SERVER_URL } from '../constants.js';

const NETWORK_RETRY_DELAY_MS = 1500;
const REFERENCE_IMAGE_BASE_PATH = 'assets/characters/';
const MAX_REFERENCE_DIMENSION = 1024;
const REFERENCE_JPEG_QUALITY = 0.85;

export function isNetworkError(error) {
	return error instanceof TypeError;
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Scales the longer edge down to MAX_REFERENCE_DIMENSION; never upscales.
async function downscaleImage(blob) {
	const bitmap = await createImageBitmap(blob);
	const scale = Math.min(
		1,
		MAX_REFERENCE_DIMENSION / Math.max(bitmap.width, bitmap.height),
	);
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

	return new Promise(resolve =>
		canvas.toBlob(resolve, 'image/jpeg', REFERENCE_JPEG_QUALITY),
	);
}

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const dataUrl = reader.result;
			resolve(dataUrl.substring(dataUrl.indexOf(',') + 1));
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

// Skips and warns on load failure rather than failing the whole generation.
async function loadReferenceImage({ elementName, variantName, image }) {
	try {
		const response = await fetch(`${REFERENCE_IMAGE_BASE_PATH}${image}`);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const originalBlob = await response.blob();
		const resizedBlob = await downscaleImage(originalBlob);
		const data = await blobToBase64(resizedBlob);
		const label = variantName
			? `This photo shows ${elementName}'s appearance ONLY in ${variantName} variant — face shape, coloring, features, and physique. Do NOT reuse this photo's pose, facial expression, gaze direction, or camera angle in the new image.`
			: `This photo shows ${elementName}'s appearance ONLY — face shape, coloring, features, and physique. Do NOT reuse this photo's pose, facial expression, gaze direction, or camera angle in the new image.`;
		return { mimeType: resizedBlob.type || 'image/jpeg', data, label };
	} catch (error) {
		console.warn(`Skipping reference image "${image}":`, error);
		return null;
	}
}

// Loads/downscales the reference image for each entity that has one, in parallel.
export async function loadReferenceImages(entities) {
	const loaded = await Promise.all(
		entities
			.filter(({ image }) => image)
			.map(entity => loadReferenceImage(entity)),
	);
	return loaded.filter(Boolean);
}

// Retries once when the local server is unreachable.
export async function generateImageWithNetworkRetry({
	prompt,
	referenceImages,
	onRetry,
}) {
	try {
		return await generateImage({ prompt, referenceImages });
	} catch (error) {
		if (!isNetworkError(error)) throw error;
		onRetry?.();
		await delay(NETWORK_RETRY_DELAY_MS);
		return generateImage({ prompt, referenceImages });
	}
}

// Returns { imageUrl: null, blob: null, raw } when the server responds without inline image data.
export async function generateImage({ prompt, referenceImages }) {
	const response = await fetch(SERVER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt, referenceImages }),
	});

	const data = await response.json();

	if (data.error) throw new Error(data.error);

	if (!data.imageUrl) {
		return { imageUrl: null, blob: null, raw: data };
	}

	const fetchRes = await fetch(data.imageUrl);
	const blob = await fetchRes.blob();

	return { imageUrl: data.imageUrl, blob, raw: data };
}
