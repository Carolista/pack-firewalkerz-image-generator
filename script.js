import PACK_DATABASE from './data.json' with { type: 'json' };

let generatedBlob = null;

const FORM_OPTIONS = [
	['homid', 'Homid (Human)'],
	['lupus', 'Lupus (Wolf)'],
	['crinos', 'Crinos (Werewolf)'],
];

const statusText = document.getElementById('statusText');
const imgElem = document.getElementById('outputImg');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');
const apiKeyInput = document.getElementById('apiKey');
const characterRowsContainer = document.getElementById('characterRows');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const locationSelect = document.getElementById('locationSelect');
const sceneText = document.getElementById('sceneText');

const API_KEY_STORAGE_KEY = 'geminiApiKey';
const CHARACTER_ROWS_STORAGE_KEY = 'ww20CharacterRows';
const SELECTION_STORAGE_KEYS = {
	[locationSelect.id]: 'ww20LocationSelect',
};

populateLocationSelect();
restoreApiKey();
restoreSelections();
restoreCharacterRows();

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
resetBtn.addEventListener('click', resetScene);
apiKeyInput.addEventListener('input', persistApiKey);
addCharacterBtn.addEventListener('click', () => {
	createCharacterRow();
	refreshCharacterOptions();
	updateAddButtonState();
	updateRemoveButtonsVisibility();
	persistCharacterRows();
});
locationSelect.addEventListener('change', persistSelection);

function populateLocationSelect() {
	for (const [key, setting] of Object.entries(PACK_DATABASE.settings)) {
		locationSelect.add(new Option(setting.name, key));
	}
}

function getAvailableCharacterKeys(excludeSelectEl) {
	const chosenElsewhere = [
		...characterRowsContainer.querySelectorAll('.charRowSelect'),
	]
		.filter(select => select !== excludeSelectEl)
		.map(select => select.value);
	return Object.keys(PACK_DATABASE.characters).filter(
		key => !chosenElsewhere.includes(key),
	);
}

function refreshCharacterOptions() {
	for (const select of characterRowsContainer.querySelectorAll(
		'.charRowSelect',
	)) {
		const currentValue = select.value;
		const availableKeys = getAvailableCharacterKeys(select);
		select.innerHTML = '';
		for (const key of availableKeys) {
			select.add(new Option(PACK_DATABASE.characters[key].name, key));
		}
		if (availableKeys.includes(currentValue)) select.value = currentValue;
	}
}

function updateAddButtonState() {
	const rowCount =
		characterRowsContainer.querySelectorAll('.character-row').length;
	const totalCharacters = Object.keys(PACK_DATABASE.characters).length;
	addCharacterBtn.hidden = rowCount >= totalCharacters;
}

function updateRemoveButtonsVisibility() {
	const rows = characterRowsContainer.querySelectorAll('.character-row');
	for (const row of rows) {
		const removeBtn = row.querySelector('.removeRowBtn');
		if (removeBtn) removeBtn.hidden = rows.length <= 1;
	}
}

function createCharacterRow(presetCharKey, presetFormKey) {
	const row = document.createElement('div');
	row.className = 'character-row';

	const charField = document.createElement('div');
	charField.className = 'field';
	const charLabel = document.createElement('label');
	charLabel.textContent = 'Character';
	const charSelect = document.createElement('select');
	charSelect.className = 'charRowSelect';
	for (const key of getAvailableCharacterKeys(charSelect)) {
		charSelect.add(new Option(PACK_DATABASE.characters[key].name, key));
	}
	if (presetCharKey) charSelect.value = presetCharKey;
	charField.append(charLabel, charSelect);

	const formField = document.createElement('div');
	formField.className = 'field';
	const formLabel = document.createElement('label');
	formLabel.textContent = 'Active Form';
	const formSelect = document.createElement('select');
	formSelect.className = 'formRowSelect';
	for (const [value, label] of FORM_OPTIONS) {
		formSelect.add(new Option(label, value));
	}
	if (presetFormKey) formSelect.value = presetFormKey;
	formField.append(formLabel, formSelect);

	row.append(charField, formField);

	const handleRowChange = () => {
		refreshCharacterOptions();
		persistCharacterRows();
	};
	charSelect.addEventListener('change', handleRowChange);
	formSelect.addEventListener('change', handleRowChange);

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'removeRowBtn';
	removeBtn.textContent = '✕';
	removeBtn.addEventListener('click', () => {
		row.remove();
		refreshCharacterOptions();
		updateAddButtonState();
		updateRemoveButtonsVisibility();
		persistCharacterRows();
	});
	row.append(removeBtn);

	characterRowsContainer.append(row);
}

function persistCharacterRows() {
	const rows = [
		...characterRowsContainer.querySelectorAll('.character-row'),
	].map(row => ({
		char: row.querySelector('.charRowSelect').value,
		form: row.querySelector('.formRowSelect').value,
	}));
	localStorage.setItem(CHARACTER_ROWS_STORAGE_KEY, JSON.stringify(rows));
}

function restoreCharacterRows() {
	let stored = [];
	try {
		stored = JSON.parse(localStorage.getItem(CHARACTER_ROWS_STORAGE_KEY)) || [];
	} catch {
		stored = [];
	}

	const validRows = stored.filter(
		entry =>
			PACK_DATABASE.characters[entry.char] &&
			FORM_OPTIONS.some(([value]) => value === entry.form),
	);

	if (validRows.length === 0) {
		createCharacterRow();
	} else {
		for (const { char, form } of validRows) createCharacterRow(char, form);
	}
	refreshCharacterOptions();
	updateAddButtonState();
	updateRemoveButtonsVisibility();
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
	for (const select of [locationSelect]) {
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

	const characterRows = [
		...characterRowsContainer.querySelectorAll('.character-row'),
	];
	if (characterRows.length === 0) {
		alert('Please add at least one character.');
		return;
	}

	// User input
	const locationKey = locationSelect.value;
	const scene = sceneText.value;

	const locationDesc = PACK_DATABASE.settings[locationKey].description;

	const characterBlocks = characterRows
		.map(row => {
			const charKey = row.querySelector('.charRowSelect').value;
			const formKey = row.querySelector('.formRowSelect').value;
			const character = PACK_DATABASE.characters[charKey];
			const formDesc = character[formKey];
			return `Character: ${character.name} in ${formKey.toUpperCase()} form (${formDesc}).`;
		})
		.join('\n');

	const fullPrompt = `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${characterBlocks}
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
