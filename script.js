import PACK_DATABASE from './data.json' with { type: 'json' };

let generatedBlob = null;

const statusText = document.getElementById('statusText');
const imgElem = document.getElementById('outputImg');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');
const apiKeyInput = document.getElementById('apiKey');
const charSelect = document.getElementById('charSelect');
const formSelect = document.getElementById('formSelect');
const locationSelect = document.getElementById('locationSelect');
const sceneText = document.getElementById('sceneText');

const API_KEY_STORAGE_KEY = 'geminiApiKey';
const SELECTION_STORAGE_KEYS = {
	[charSelect.id]: 'ww20CharSelect',
	[formSelect.id]: 'ww20FormSelect',
	[locationSelect.id]: 'ww20LocationSelect',
};

populateSelects();
restoreApiKey();
restoreSelections();

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
resetBtn.addEventListener('click', resetScene);
apiKeyInput.addEventListener('input', persistApiKey);
for (const select of [charSelect, formSelect, locationSelect]) {
	select.addEventListener('change', persistSelection);
}

function populateSelects() {
	for (const [key, character] of Object.entries(PACK_DATABASE.characters)) {
		charSelect.add(new Option(character.name, key));
	}
	for (const [key, setting] of Object.entries(PACK_DATABASE.settings)) {
		locationSelect.add(new Option(setting.name, key));
	}
}

function restoreApiKey() {
	const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
	if (storedKey) apiKeyInput.value = storedKey;
}

function persistApiKey() {
	const value = apiKeyInput.value.trim();
	if (value && value !== localStorage.getItem(API_KEY_STORAGE_KEY)) {
		localStorage.setItem(API_KEY_STORAGE_KEY, value);
	}
}

function restoreSelections() {
	for (const select of [charSelect, formSelect, locationSelect]) {
		const storedValue = localStorage.getItem(SELECTION_STORAGE_KEYS[select.id]);
		// only restore if the stored value still matches an available option
		if (storedValue && [...select.options].some(o => o.value === storedValue)) {
			select.value = storedValue;
		}
	}
}

function persistSelection(event) {
	const select = event.target;
	localStorage.setItem(SELECTION_STORAGE_KEYS[select.id], select.value);
}

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

	// User input
	const charKey = charSelect.value;
	const formKey = formSelect.value;
	const locationKey = locationSelect.value;
	const scene = sceneText.value;

	const character = PACK_DATABASE.characters[charKey];
	const formDesc = character[formKey];
	const locationDesc = PACK_DATABASE.settings[locationKey].description;

	const fullPrompt = `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
Character: ${character.name} in ${formKey.toUpperCase()} form (${formDesc}). 
Environment/Setting: ${locationDesc}. 
Action/Scene: ${scene}`;

	statusText.innerText = 'Generating image (takes ~5-10 seconds)...';
	imgElem.style.display = 'none';
	shareBtn.style.display = 'none';

	try {
		const response = await fetch('http://localhost:3000/generate-image', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apiKey: apiKey,
				prompt: fullPrompt,
			}),
		});

		const data = await response.json();

		if (data.error) throw new Error(data.error);

		// Server directly returns `{ imageUrl: "data:image/jpeg;base64,..." }`
		if (data.imageUrl) {
			const imageUrl = data.imageUrl;

			imgElem.src = imageUrl;
			imgElem.style.display = 'block';
			statusText.innerText = 'Done!';

			const fetchRes = await fetch(imageUrl);
			generatedBlob = await fetchRes.blob();

			if (
				navigator.canShare &&
				navigator.canShare({
					files: [
						new File([generatedBlob], 'scene.jpg', {
							type: 'image/jpeg',
						}),
					],
				})
			) {
				shareBtn.style.display = 'inline-block';
			}
		} else {
			statusText.innerText =
				'Response received, but no inline image data was returned.';
			console.log('Response payload:', data);
		}
	} catch (err) {
		statusText.innerText = `Error: ${err.message}`;
		console.error('Client Error:', err);
	}
}

async function shareImage() {
	if (!generatedBlob) return;
	const file = new File([generatedBlob], 'ww20-scene.jpg', {
		type: 'image/jpeg',
	});
	try {
		await navigator.share({
			title: 'WW20 Session Moment',
			text: "Look at what happened in tonight's session!",
			files: [file],
		});
	} catch (err) {
		console.log('Share canceled or failed:', err);
	}
}
