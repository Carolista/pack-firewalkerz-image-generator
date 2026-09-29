import { SERVER_URL } from '../constants.js';
import { SUPABASE_URL } from './supabaseConfig.js';

const NETWORK_RETRY_DELAY_MS = 1500;
const SUPABASE_IMAGE_BASE_PATH = `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/`;
const MAX_REFERENCE_DIMENSION = 1024;
const REFERENCE_JPEG_QUALITY = 0.85;

export function isNetworkError(error) {
	return error instanceof TypeError;
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function resolveReferenceImageUrl(image) {
	if (image.startsWith('http://') || image.startsWith('https://')) {
		return image;
	}
	if (image.startsWith('assets/')) return image;
	const storagePath = image.includes('/') ? image : `characters/${image}`;
	const encodedPath = storagePath
		.split('/')
		.map(segment => encodeURIComponent(segment))
		.join('/');
	return `${SUPABASE_IMAGE_BASE_PATH}${encodedPath}`;
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
async function loadReferenceImage(image) {
	try {
		const response = await fetch(resolveReferenceImageUrl(image));
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const originalBlob = await response.blob();
		const resizedBlob = await downscaleImage(originalBlob);
		const data = await blobToBase64(resizedBlob);
		return { mimeType: resizedBlob.type || 'image/jpeg', data };
	} catch (error) {
		console.warn(`Skipping reference image "${image}":`, error);
		return null;
	}
}

// Converts prompt parts to request parts; an image that failed to load is dropped with its label.
export function assembleRequestParts(parts, imageDataByPath) {
	return parts.flatMap(part => {
		if (part.type === 'text') return [{ text: part.text }];
		const inlineData = imageDataByPath.get(part.image);
		return inlineData ? [{ text: part.label }, { inlineData }] : [];
	});
}

export async function resolvePromptParts(parts) {
	const imagePaths = [
		...new Set(
			parts.filter(part => part.type === 'image').map(part => part.image),
		),
	];
	const loaded = await Promise.all(imagePaths.map(loadReferenceImage));
	const imageDataByPath = new Map(
		imagePaths.map((path, index) => [path, loaded[index]]),
	);
	return assembleRequestParts(parts, imageDataByPath);
}

// Retries once when the local server is unreachable.
export async function generateImageWithNetworkRetry({ parts, onRetry }) {
	try {
		return await generateImage({ parts });
	} catch (error) {
		if (!isNetworkError(error)) throw error;
		onRetry?.();
		await delay(NETWORK_RETRY_DELAY_MS);
		return generateImage({ parts });
	}
}

// Returns { imageUrl: null, blob: null, raw } when the server responds without inline image data.
export async function generateImage({ parts }) {
	const response = await fetch(SERVER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ parts }),
	});

	const data = await response.json().catch(() => null);

	if (!response.ok || !data || data.error) {
		// The server's detail is developer-facing; callers log it and show their own message.
		throw new Error('Image generation failed.', {
			cause: data?.detail ?? data?.error ?? `HTTP ${response.status}`,
		});
	}

	if (!data.imageUrl) {
		return { imageUrl: null, blob: null, raw: data };
	}

	const fetchRes = await fetch(data.imageUrl);
	const blob = await fetchRes.blob();

	return { imageUrl: data.imageUrl, blob, raw: data };
}
