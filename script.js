import { buildPrompt } from './src/prompt.js';
import { generateImage } from './src/services/api.js';
import { canShareFile, shareFile } from './src/services/share.js';
import { getApiKey } from './src/services/storage.js';
import { initApiKeyModal, requestApiKey } from './src/ui/apiKeyModal.js';
import {
	getCharacterSelections,
	hasAtLeastOneRow,
	initCharacterRows,
} from './src/ui/characterRows.js';
import {
	getLocationDescription,
	initSettingField,
} from './src/ui/settingField.js';

let generatedBlob = null;

const statusText = document.getElementById('statusText');
const imgElem = document.getElementById('outputImg');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');
const retryBtn = document.getElementById('retryBtn');
const sceneText = document.getElementById('sceneText');

initCharacterRows({
	container: document.getElementById('characterRows'),
	addBtn: document.getElementById('addCharacterBtn'),
});

initSettingField({
	selectEl: document.getElementById('locationSelect'),
	descEl: document.getElementById('locationDescText'),
	otherTextEl: document.getElementById('otherLocationText'),
});

initApiKeyModal({
	overlay: document.getElementById('apiKeyModalOverlay'),
	closeBtn: document.getElementById('apiKeyModalCloseBtn'),
	input: document.getElementById('apiKeyModalInput'),
	submitBtn: document.getElementById('apiKeyModalSubmitBtn'),
	messageEl: document.getElementById('apiKeyModalMessage'),
});

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
resetBtn.addEventListener('click', resetScene);
retryBtn.addEventListener('click', generateSceneImage);

function resetScene() {
	sceneText.value = '';
	imgElem.src = '';
	imgElem.style.display = 'none';
	shareBtn.style.display = 'none';
	retryBtn.style.display = 'none';
	statusText.innerText = 'Ready.';
	generatedBlob = null;
}

const INVALID_API_KEY_PATTERN = /api[ _-]?key/i;
const NETWORK_RETRY_DELAY_MS = 1500;

function isNetworkError(err) {
	// fetch() rejects with a TypeError when the request never reaches a server (down/unreachable).
	return err instanceof TypeError;
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function describeError(err) {
	return isNetworkError(err)
		? 'Could not reach the local server. Make sure `node server.js` is running.'
		: err.message;
}

function showError(err) {
	statusText.innerText = `Error: ${describeError(err)}`;
	console.error('Client Error:', err);
	retryBtn.style.display = 'inline-block';
}

function applyGenerationResult({ imageUrl, blob, raw }) {
	if (imageUrl) {
		imgElem.src = imageUrl;
		imgElem.style.display = 'block';
		statusText.innerText = 'Done!';
		generatedBlob = blob;

		if (canShareFile(generatedBlob, 'scene.jpg', 'image/jpeg')) {
			shareBtn.style.display = 'inline-block';
		}
	} else {
		statusText.innerText =
			'Response received, but no inline image data was returned.';
		console.log('Response payload:', raw);
	}
}

async function generateSceneImage() {
	retryBtn.style.display = 'none';

	if (!hasAtLeastOneRow()) {
		alert('Please add at least one character.');
		return;
	}

	const locationDesc = getLocationDescription();
	if (!locationDesc) {
		alert('Please describe the custom setting.');
		return;
	}

	let apiKey = getApiKey();
	if (!apiKey) {
		apiKey = await requestApiKey();
		if (!apiKey) return; // user canceled the modal
	}

	const characters = getCharacterSelections();
	const scene = sceneText.value;
	const fullPrompt = buildPrompt({ characters, locationDesc, scene });

	statusText.innerText = 'Generating image (takes ~5-10 seconds)...';
	imgElem.style.display = 'none';
	shareBtn.style.display = 'none';

	try {
		const result = await generateImage({ apiKey, prompt: fullPrompt });
		applyGenerationResult(result);
	} catch (err) {
		if (isNetworkError(err)) {
			statusText.innerText = 'Connection issue, retrying...';
			await delay(NETWORK_RETRY_DELAY_MS);
			try {
				const retryResult = await generateImage({
					apiKey,
					prompt: fullPrompt,
				});
				applyGenerationResult(retryResult);
			} catch (retryErr) {
				showError(retryErr);
			}
			return;
		}

		if (!INVALID_API_KEY_PATTERN.test(err.message)) {
			showError(err);
			return;
		}

		const newApiKey = await requestApiKey({ invalid: true });
		if (!newApiKey) {
			showError(err);
			return;
		}

		try {
			const retryResult = await generateImage({
				apiKey: newApiKey,
				prompt: fullPrompt,
			});
			applyGenerationResult(retryResult);
		} catch (retryErr) {
			showError(retryErr);
		}
	}
}

async function shareImage() {
	if (!generatedBlob) return;
	await shareFile(generatedBlob, {
		filename: 'ww20-scene.jpg',
		mimeType: 'image/jpeg',
		title: 'WW20 Session Moment',
		text: "Look at what happened in tonight's session!",
	});
}
