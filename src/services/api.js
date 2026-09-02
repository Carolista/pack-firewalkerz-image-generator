import { SERVER_URL } from '../constants.js';

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
