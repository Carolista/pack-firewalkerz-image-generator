import { FORM_OPTIONS } from '../constants.js';
import PACK_DATA from '../packData.json' with { type: 'json' };
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
		updateRemoveButtonsVisibility();
		persistCharacterRows();
	});

	restoreCharacterRows();
}

export function getCharacterSelections() {
	return [...containerEl.querySelectorAll('.character-row')].map(row => {
		const charKey = row.querySelector('.charRowSelect').value;
		const formKey = row.querySelector('.formRowSelect').value;
		const character = PACK_DATA.characters[charKey];
		return { name: character.name, formKey, formDesc: character[formKey] };
	});
}

export function hasAtLeastOneRow() {
	return containerEl.querySelectorAll('.character-row').length > 0;
}

function getAvailableCharacterKeys(excludeSelectEl) {
	const chosenElsewhere = [...containerEl.querySelectorAll('.charRowSelect')]
		.filter(select => select !== excludeSelectEl)
		.map(select => select.value);
	return Object.keys(PACK_DATA.characters).filter(
		key => !chosenElsewhere.includes(key),
	);
}

function refreshCharacterOptions() {
	for (const select of containerEl.querySelectorAll('.charRowSelect')) {
		const currentValue = select.value;
		const availableKeys = getAvailableCharacterKeys(select);
		select.innerHTML = '';
		for (const key of availableKeys) {
			select.add(new Option(PACK_DATA.characters[key].name, key));
		}
		if (availableKeys.includes(currentValue)) select.value = currentValue;
	}
}

function updateAddButtonState() {
	const rowCount = containerEl.querySelectorAll('.character-row').length;
	const totalCharacters = Object.keys(PACK_DATA.characters).length;
	addBtnEl.hidden = rowCount >= totalCharacters;
}

function updateRemoveButtonsVisibility() {
	const rows = containerEl.querySelectorAll('.character-row');
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
		charSelect.add(new Option(PACK_DATA.characters[key].name, key));
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

	const validRows = stored.filter(
		entry =>
			PACK_DATA.characters[entry.char] &&
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
