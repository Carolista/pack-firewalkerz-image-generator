import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();

app.use(
	cors({
		origin: [
			'http://codewithcarrie.com',
			'https://codewithcarrie.com',
			'http://127.0.0.1:5500',
			'http://localhost:5500',
		],
	}),
);
app.use(express.json({ limit: '20mb' }));

const MAX_PARTS = 120;
const MAX_IMAGE_PARTS = 40;
const MAX_TEXT_LENGTH = 10000;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
]);

function getTextPartError(part) {
	if (typeof part.text !== 'string' || !part.text.length) {
		return 'text is empty';
	}
	if (part.text.length > MAX_TEXT_LENGTH) {
		return `text is ${part.text.length} characters (max ${MAX_TEXT_LENGTH})`;
	}
	return null;
}

function getImagePartError({ inlineData }) {
	if (inlineData === null || typeof inlineData !== 'object') {
		return 'inlineData is not an object';
	}
	if (!ALLOWED_IMAGE_MIME_TYPES.has(inlineData.mimeType)) {
		return `unsupported image type "${inlineData.mimeType}"`;
	}
	if (typeof inlineData.data !== 'string' || !inlineData.data.length) {
		return 'image data is empty';
	}
	return null;
}

// Returns { parts } with only the fields Gemini needs, or { reason } when the payload is malformed.
function sanitizeParts(parts) {
	if (!Array.isArray(parts) || !parts.length) {
		return { reason: '"parts" must be a non-empty array' };
	}
	if (parts.length > MAX_PARTS) {
		return { reason: `${parts.length} parts (max ${MAX_PARTS})` };
	}
	let imageCount = 0;
	const sanitized = [];
	for (const [index, part] of parts.entries()) {
		if (part === null || typeof part !== 'object') {
			return { reason: `part ${index} is not an object` };
		}
		if ('text' in part) {
			const error = getTextPartError(part);
			if (error) return { reason: `part ${index}: ${error}` };
			sanitized.push({ text: part.text });
		} else if ('inlineData' in part) {
			const error = getImagePartError(part);
			if (error) return { reason: `part ${index}: ${error}` };
			imageCount += 1;
			const { mimeType, data } = part.inlineData;
			sanitized.push({ inlineData: { mimeType, data } });
		} else {
			return { reason: `part ${index} has neither text nor inlineData` };
		}
	}
	if (imageCount > MAX_IMAGE_PARTS) {
		return { reason: `${imageCount} images (max ${MAX_IMAGE_PARTS})` };
	}
	return { parts: sanitized };
}

function sendError(res, status, detail) {
	console.error(`/generate-image ${status}: ${detail}`);
	res.status(status).json({ error: 'Image generation failed.', detail });
}

app.post('/generate-image', async (req, res) => {
	try {
		const { parts, reason } = sanitizeParts(req.body?.parts);
		if (reason) {
			return sendError(res, 400, `Invalid prompt parts: ${reason}`);
		}

		const apiKey = process.env.GEMINI_API_KEY;

		if (!apiKey) {
			return sendError(res, 500, 'GEMINI_API_KEY is not configured.');
		}

		const ai = new GoogleGenAI({ apiKey });

		const response = await ai.models.generateContent({
			model: IMAGE_MODEL,
			contents: parts,
			// Without this, the model may match a reference image's aspect ratio.
			config: { imageConfig: { aspectRatio: '1:1' } },
		});

		const candidates = response.candidates;
		// Gemini 3 image models may emit interim thought images before the final one.
		const outputParts = (candidates?.[0]?.content?.parts ?? []).filter(
			p => !p.thought,
		);
		const part = outputParts.findLast(p => p.inlineData);

		if (!part) {
			const modelText = outputParts
				.map(p => p.text)
				.filter(Boolean)
				.join(' ');
			return sendError(
				res,
				500,
				`No image in ${IMAGE_MODEL} response (finishReason: ${candidates?.[0]?.finishReason ?? 'none'}${modelText ? `; model text: ${modelText}` : ''}).`,
			);
		}

		const base64Data = part.inlineData.data;
		const mimeType = part.inlineData.mimeType || 'image/jpeg';

		res.json({ imageUrl: `data:${mimeType};base64,${base64Data}` });
	} catch (error) {
		console.error('Server Error:', error);
		sendError(res, 500, error.message || 'Internal Server Error');
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`🚀 Proxy Server running on port ${PORT} using ${IMAGE_MODEL}`);
});
