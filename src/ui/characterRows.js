import { WEREWOLF_VARIANTS } from '../constants.js';
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
		const variantKey = row.querySelector('.variantRowSelect').value;
		const character = DATA.characters[charKey];
		const variant = character.variants[variantKey];
		return {
			name: character.name,
			variantKey,
			variantName: WEREWOLF_VARIANTS[variantKey],
			variantDesc: variant.description,
			imageFile: variant.imageFile,
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

// Rebuilds the Variant select to match whichever character is currently chosen in this row.
function populateVariantOptions(charSelect, variantSelect, presetVariantKey) {
	const character = DATA.characters[charSelect.value];
	variantSelect.innerHTML = '';
	for (const variantKey of Object.keys(character.variants)) {
		variantSelect.add(
			new Option(WEREWOLF_VARIANTS[variantKey], variantKey),
		);
	}
	if (presetVariantKey && character.variants[presetVariantKey]) {
		variantSelect.value = presetVariantKey;
	}
}

function createCharacterRow(presetCharKey, presetVariantKey) {
	const row = document.createElement('div');
	row.className = 'character-row';

	const charField = document.createElement('div');
	charField.className = 'field';
	const charLabel = document.createElement('label');
	charLabel.textContent = 'PC';
	const charSelect = document.createElement('select');
	charSelect.className = 'charRowSelect';
	for (const key of getAvailableCharacterKeys(charSelect)) {
		charSelect.add(new Option(DATA.characters[key].name, key));
	}
	if (presetCharKey) charSelect.value = presetCharKey;
	charField.append(charLabel, charSelect);

	const variantField = document.createElement('div');
	variantField.className = 'field';
	const variantLabel = document.createElement('label');
	variantLabel.textContent = 'Variant';
	const variantSelect = document.createElement('select');
	variantSelect.className = 'variantRowSelect';
	variantField.append(variantLabel, variantSelect);
	populateVariantOptions(charSelect, variantSelect, presetVariantKey);

	row.append(charField, variantField);

	charSelect.addEventListener('change', () => {
		populateVariantOptions(charSelect, variantSelect);
		refreshCharacterOptions();
		persistCharacterRows();
	});
	variantSelect.addEventListener('change', persistCharacterRows);

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
			variant: row.querySelector('.variantRowSelect').value,
		}),
	);
	setCharacterRows(rows);
}

function restoreCharacterRows() {
	const stored = getCharacterRows();

	const validRows = stored.filter(entry => {
		const character = DATA.characters[entry.char];
		return character && character.variants[entry.variant];
	});

	for (const { char, variant } of validRows)
		createCharacterRow(char, variant);
	refreshCharacterOptions();
	updateAddButtonState();
}
