import DATA from '../data.json' with { type: 'json' };
import { getCharacterRows, setCharacterRows } from '../services/storage.js';

let containerEl;
let addBtnEl;

export function initCharacterRows({ container, addBtn }) {
	containerEl = container;
	addBtnEl = addBtn;

	addBtnEl.addEventListener('click', () => {
		createCharacterRow();
		refreshCharacterOptions();
		updateAddButtonState();
		persistCharacterRows();
	});

	restoreCharacterRows();
}

export function getCharacterSelections() {
	return [...containerEl.querySelectorAll('.character-row')].map(row => {
		const charKey = row.querySelector('.charRowSelect').value;
		const formKey = row.querySelector('.formRowSelect').value;
		const character = DATA.characters[charKey];
		const form = character.forms[formKey];
		return {
			name: character.name,
			formKey,
			formName: form.name,
			formDesc: form.description,
			imageFile: form.imageFile,
		};
	});
}

export function hasAtLeastOneRow() {
	return containerEl.querySelectorAll('.character-row').length > 0;
}

function getAvailableCharacterKeys(excludeSelectEl) {
	const chosenElsewhere = [...containerEl.querySelectorAll('.charRowSelect')]
		.filter(select => select !== excludeSelectEl)
		.map(select => select.value);
	return Object.keys(DATA.characters).filter(
		key => !chosenElsewhere.includes(key),
	);
}

function refreshCharacterOptions() {
	for (const select of containerEl.querySelectorAll('.charRowSelect')) {
		const currentValue = select.value;
		const availableKeys = getAvailableCharacterKeys(select);
		select.innerHTML = '';
		for (const key of availableKeys) {
			select.add(new Option(DATA.characters[key].name, key));
		}
		if (availableKeys.includes(currentValue)) select.value = currentValue;
	}
}

function updateAddButtonState() {
	const rowCount = containerEl.querySelectorAll('.character-row').length;
	const totalCharacters = Object.keys(DATA.characters).length;
	addBtnEl.hidden = rowCount >= totalCharacters;
	addBtnEl.textContent =
		rowCount === 0 ? 'Select a character' : 'Add another character';
}

// Rebuilds the Active Form select to match whichever character is currently chosen in this row.
function populateFormOptions(charSelect, formSelect, presetFormKey) {
	const character = DATA.characters[charSelect.value];
	formSelect.innerHTML = '';
	for (const [formKey, form] of Object.entries(character.forms)) {
		formSelect.add(new Option(form.name, formKey));
	}
	if (presetFormKey && character.forms[presetFormKey]) {
		formSelect.value = presetFormKey;
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
		charSelect.add(new Option(DATA.characters[key].name, key));
	}
	if (presetCharKey) charSelect.value = presetCharKey;
	charField.append(charLabel, charSelect);

	const formField = document.createElement('div');
	formField.className = 'field';
	const formLabel = document.createElement('label');
	formLabel.textContent = 'Active Form';
	const formSelect = document.createElement('select');
	formSelect.className = 'formRowSelect';
	formField.append(formLabel, formSelect);
	populateFormOptions(charSelect, formSelect, presetFormKey);

	row.append(charField, formField);

	charSelect.addEventListener('change', () => {
		populateFormOptions(charSelect, formSelect);
		refreshCharacterOptions();
		persistCharacterRows();
	});
	formSelect.addEventListener('change', persistCharacterRows);

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'removeRowBtn';
	removeBtn.textContent = '✕';
	removeBtn.addEventListener('click', () => {
		row.remove();
		refreshCharacterOptions();
		updateAddButtonState();
		persistCharacterRows();
	});
	row.append(removeBtn);

	containerEl.append(row);
}

function persistCharacterRows() {
	const rows = [...containerEl.querySelectorAll('.character-row')].map(
		row => ({
			char: row.querySelector('.charRowSelect').value,
			form: row.querySelector('.formRowSelect').value,
		}),
	);
	setCharacterRows(rows);
}

function restoreCharacterRows() {
	const stored = getCharacterRows();

	const validRows = stored.filter(entry => {
		const character = DATA.characters[entry.char];
		return character && character.forms[entry.form];
	});

	for (const { char, form } of validRows) createCharacterRow(char, form);
	refreshCharacterOptions();
	updateAddButtonState();
}
