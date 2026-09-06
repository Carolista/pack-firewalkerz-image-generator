import { getElements, getVariantById } from '../services/catalog.js';
import { getCharacterRows, setCharacterRows } from '../services/storage.js';

let characters;

let containerEl;
let addBtnEl;

export function initCharacterRows({ container, addBtn }) {
	containerEl = container;
	addBtnEl = addBtn;
	characters = getElements('character');

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
		const elementId = row.querySelector('.charRowSelect').value;
		const variantId = row.querySelector('.variantRowSelect').value;
		const character = getCharacter(elementId);
		const variant = getVariantById(character, variantId);
		return {
			elementId,
			elementType: character.elementType,
			elementName: character.name,
			variantId,
			variantName: variant.variantName,
			variantDesc: variant.variantDesc,
			image: variant.image,
		};
	});
}

export function hasAtLeastOneRow() {
	return containerEl.querySelectorAll('.character-row').length > 0;
}

function getCharacter(elementId) {
	return characters.find(character => character.id === elementId);
}

function getAvailableCharacterIds(excludeSelectEl) {
	const chosenElsewhere = [...containerEl.querySelectorAll('.charRowSelect')]
		.filter(select => select !== excludeSelectEl)
		.map(select => select.value);
	return characters
		.filter(character => !chosenElsewhere.includes(character.id))
		.map(character => character.id);
}

function refreshCharacterOptions() {
	for (const select of containerEl.querySelectorAll('.charRowSelect')) {
		const currentValue = select.value;
		const availableIds = getAvailableCharacterIds(select);
		select.replaceChildren();
		for (const elementId of availableIds) {
			select.add(new Option(getCharacter(elementId).name, elementId));
		}
		if (availableIds.includes(currentValue)) select.value = currentValue;
	}
}

function updateAddButtonState() {
	const rowCount = containerEl.querySelectorAll('.character-row').length;
	addBtnEl.hidden = rowCount >= characters.length;
	addBtnEl.textContent =
		rowCount === 0 ? 'Select a character' : 'Add another character';
}

function populateVariantOptions(charSelect, variantSelect, presetVariantId) {
	const character = getCharacter(charSelect.value);
	variantSelect.replaceChildren();
	for (const variant of character.variants) {
		variantSelect.add(new Option(variant.variantName, variant.variantId));
	}
	if (presetVariantId && getVariantById(character, presetVariantId)) {
		variantSelect.value = presetVariantId;
	}
}

function createCharacterRow(presetElementId, presetVariantId) {
	const row = document.createElement('div');
	row.className = 'character-row';

	const charField = document.createElement('div');
	charField.className = 'field';
	const charLabel = document.createElement('label');
	charLabel.textContent = 'Character';
	const charSelect = document.createElement('select');
	charSelect.className = 'charRowSelect';
	for (const elementId of getAvailableCharacterIds(charSelect)) {
		charSelect.add(new Option(getCharacter(elementId).name, elementId));
	}
	if (presetElementId) charSelect.value = presetElementId;
	charField.append(charLabel, charSelect);

	const variantField = document.createElement('div');
	variantField.className = 'field';
	const variantLabel = document.createElement('label');
	variantLabel.textContent = 'Variant';
	const variantSelect = document.createElement('select');
	variantSelect.className = 'variantRowSelect';
	variantField.append(variantLabel, variantSelect);
	populateVariantOptions(charSelect, variantSelect, presetVariantId);

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
			elementId: row.querySelector('.charRowSelect').value,
			variantId: row.querySelector('.variantRowSelect').value,
		}),
	);
	setCharacterRows(rows);
}

function restoreCharacterRows() {
	const validRows = getCharacterRows().filter(entry => {
		const character = getCharacter(entry.elementId);
		return character && getVariantById(character, entry.variantId);
	});

	for (const { elementId, variantId } of validRows) {
		createCharacterRow(elementId, variantId);
	}
	refreshCharacterOptions();
	updateAddButtonState();
}
