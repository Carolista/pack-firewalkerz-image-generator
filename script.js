import { buildPrompt } from './src/prompt.js';
import {
	generateImageWithNetworkRetry,
	isNetworkError,
} from './src/services/api.js';
import { shareFile } from './src/services/share.js';
import { getApiKey } from './src/services/storage.js';
import { initApiKeyModal, requestApiKey } from './src/ui/apiKeyModal.js';
import { setGenerationBusy } from './src/ui/buttonState.js';
import {
	getCharacterSelections,
	hasAtLeastOneRow,
	initCharacterRows,
} from './src/ui/characterRows.js';
import {
	initGenerationOutput,
	resetOutput,
	showEmptyResponse,
	showError,
	showGenerating,
	showSuccess,
} from './src/ui/generationOutput.js';
import {
	getLocationDescription,
	initSettingField,
} from './src/ui/settingField.js';

let generatedBlob = null;
let generationInProgress = false;

const statusText = document.getElementById('statusText');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');
const retryBtn = document.getElementById('retryBtn');
const sceneText = document.getElementById('sceneText');

const generationControls = { generateBtn, retryBtn };

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

initGenerationOutput({
	status: statusText,
	image: document.getElementById('outputImg'),
	shareBtn,
	retryBtn,
});

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
resetBtn.addEventListener('click', resetScene);
retryBtn.addEventListener('click', generateSceneImage);

function resetScene() {
	sceneText.value = '';
	resetOutput();
	generatedBlob = null;
}

const INVALID_API_KEY_PATTERN = /api[ _-]?key/i;

async function generateSceneImage() {
	if (generationInProgress) return;
	generationInProgress = true;
	setGenerationBusy(generationControls, true);

	try {
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
			if (!apiKey) return;
		}

		const characters = getCharacterSelections();
		const scene = sceneText.value;
		const fullPrompt = buildPrompt({ characters, locationDesc, scene });

		showGenerating();

		try {
			const result = await generateImageWithNetworkRetry({
				apiKey,
				prompt: fullPrompt,
				onRetry: () =>
					(statusText.innerText = 'Connection issue, retrying...'),
			});
			if (result.imageUrl) generatedBlob = showSuccess(result);
			else showEmptyResponse(result.raw);
		} catch (err) {
			if (!INVALID_API_KEY_PATTERN.test(err.message)) {
				showError(formatError(err));
				return;
			}

			const newApiKey = await requestApiKey({ invalid: true });
			if (!newApiKey) {
				showError(formatError(err));
				return;
			}

			try {
				const retryResult = await generateImageWithNetworkRetry({
					apiKey: newApiKey,
					prompt: fullPrompt,
				});
				if (retryResult.imageUrl)
					generatedBlob = showSuccess(retryResult);
				else showEmptyResponse(retryResult.raw);
			} catch (retryErr) {
				showError(formatError(retryErr));
			}
		}
	} finally {
		generationInProgress = false;
		setGenerationBusy(generationControls, false);
	}
}

function formatError(error) {
	return isNetworkError(error)
		? 'Could not reach the local server. Make sure `node server.js` is running.'
		: error.message;
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
