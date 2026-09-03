import { SERVER_URL } from '../constants.js';

const NETWORK_RETRY_DELAY_MS = 1500;

export function isNetworkError(error) {
	return error instanceof TypeError;
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Retries once when the local server is unreachable.
export async function generateImageWithNetworkRetry({
	apiKey,
	prompt,
	onRetry,
}) {
	try {
		return await generateImage({ apiKey, prompt });
	} catch (error) {
		if (!isNetworkError(error)) throw error;
		onRetry?.();
		await delay(NETWORK_RETRY_DELAY_MS);
		return generateImage({ apiKey, prompt });
	}
}

// Returns { imageUrl: null, blob: null, raw } when the server responds without inline image data.
export async function generateImage({ apiKey, prompt }) {
	const response = await fetch(SERVER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ apiKey, prompt }),
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
