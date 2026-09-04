import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.post('/generate-image', async (req, res) => {
	try {
		const { apiKey, prompt, referenceImages = [] } = req.body;

		if (!apiKey) {
			return res.status(400).json({ error: 'API key is required.' });
		}

		const ai = new GoogleGenAI({ apiKey });

		const imageParts = referenceImages
			.filter(
				img =>
					img &&
					typeof img.mimeType === 'string' &&
					typeof img.data === 'string',
			)
			.flatMap(img => [
				...(typeof img.label === 'string' ? [{ text: img.label }] : []),
				{ inlineData: { mimeType: img.mimeType, data: img.data } },
			]);

		// Use generateContent with an AI Studio supported image model
		// Reminder is placed after the images since trailing instructions carry more weight than leading ones.
		const poseReminder =
			imageParts.length > 0
				? [
						{
							text: "Reminder: the reference photos above are for each character's appearance only (face, coloring, features, physique). Disregard their poses, facial expressions, gaze directions, and camera angles entirely — pose, express, and orient every character strictly according to the Action/Scene description given earlier.",
						},
					]
				: [];

		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash-image',
			contents: [{ text: prompt }, ...imageParts, ...poseReminder],
		});

		// Extract base64 image data from the response structure
		const candidates = response.candidates;
		const part = candidates?.[0]?.content?.parts?.find(p => p.inlineData);

		if (!part || !part.inlineData) {
			return res
				.status(500)
				.json({ error: 'No image returned in response.' });
		}

		const base64Data = part.inlineData.data;
		const mimeType = part.inlineData.mimeType || 'image/jpeg';

		res.json({ imageUrl: `data:${mimeType};base64,${base64Data}` });
	} catch (error) {
		console.error('Server Error:', error);
		res.status(500).json({
			error: error.message || 'Internal Server Error',
		});
	}
});

app.listen(3000, () => {
	console.log('🚀 Local WW20 Proxy Server running on http://localhost:3000');
});
