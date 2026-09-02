import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate-image', async (req, res) => {
	try {
		const { apiKey, prompt } = req.body;

		if (!apiKey) {
			return res.status(400).json({ error: 'API key is required.' });
		}

		const ai = new GoogleGenAI({ apiKey });

		// Use generateContent with an AI Studio supported image model
		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash-image',
			contents: prompt,
		});

		// Extract base64 image data from the response structure
		const candidates = response.candidates;
		const part = candidates?.[0]?.content?.parts?.find(p => p.inlineData);

		if (!part || !part.inlineData) {
			return res.status(500).json({ error: 'No image returned in response.' });
		}

		const base64Data = part.inlineData.data;
		const mimeType = part.inlineData.mimeType || 'image/jpeg';

		res.json({ imageUrl: `data:${mimeType};base64,${base64Data}` });
	} catch (error) {
		console.error('Server Error:', error);
		res.status(500).json({ error: error.message || 'Internal Server Error' });
	}
});

app.listen(3000, () => {
	console.log('🚀 Local WW20 Proxy Server running on http://localhost:3000');
});
