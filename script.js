import { buildPrompt } from './src/prompt.js';
import { generateImage } from './src/services/api.js';
import { canShareFile, shareFile } from './src/services/share.js';
import { getApiKey, setApiKeyIfChanged } from './src/services/storage.js';
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
const apiKeyInput = document.getElementById('apiKey');
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

const storedApiKey = getApiKey();
if (storedApiKey) apiKeyInput.value = storedApiKey;

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
resetBtn.addEventListener('click', resetScene);
apiKeyInput.addEventListener('input', () => {
	setApiKeyIfChanged(apiKeyInput.value.trim());
});

function resetScene() {
	sceneText.value = '';
	imgElem.src = '';
	imgElem.style.display = 'none';
	shareBtn.style.display = 'none';
	statusText.innerText = 'Ready.';
	generatedBlob = null;
}

async function generateSceneImage() {
	const apiKey = apiKeyInput.value.trim();

	if (!apiKey) {
		alert('Please paste your API key first.');
		return;
	}

	if (!hasAtLeastOneRow()) {
		alert('Please add at least one character.');
		return;
	}

	const locationDesc = getLocationDescription();
	if (!locationDesc) {
		alert('Please describe the custom setting.');
		return;
	}

	const characters = getCharacterSelections();
	const scene = sceneText.value;
	const fullPrompt = buildPrompt({ characters, locationDesc, scene });

	statusText.innerText = 'Generating image (takes ~5-10 seconds)...';
	imgElem.style.display = 'none';
	shareBtn.style.display = 'none';

	try {
		const { imageUrl, blob, raw } = await generateImage({
			apiKey,
			prompt: fullPrompt,
		});

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
	} catch (err) {
		statusText.innerText = `Error: ${err.message}`;
		console.error('Client Error:', err);
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
