import { WEREWOLF_FORMS } from '../constants.js';
import DATA from '../data.json' with { type: 'json' };
import { getNPCRows, setNPCRows } from '../services/storage.js';

let containerEl;
let addBtnEl;

export function initNPCRows({ container, addBtn }) {
	containerEl = container;
	addBtnEl = addBtn;

	addBtnEl.addEventListener('click', () => {
		createNPCRow();
		refreshNPCOptions();
		updateAddButtonState();
		persistNPCRows();
	});

	restoreNPCRows();
}

export function getNPCSelections() {
	return [...containerEl.querySelectorAll('.npc-row')].map(row => {
		const npcKey = row.querySelector('.npcRowSelect').value;
		const npc = DATA.npcs[npcKey];
		const formSelect = row.querySelector('.npcFormRowSelect');

		if (!formSelect) {
			return { name: npc.name, description: npc.description };
		}

		const formKey = formSelect.value;
		const form = npc.forms[formKey];
		return {
			name: npc.name,
			formKey,
			formName: WEREWOLF_FORMS[formKey],
			description: form.description,
			imageFile: form.imageFile,
		};
	});
}

export function hasAtLeastOneRow() {
	return containerEl.querySelectorAll('.npc-row').length > 0;
}

function getAvailableNPCKeys(excludeSelectEl) {
	const chosenElsewhere = [...containerEl.querySelectorAll('.npcRowSelect')]
		.filter(select => select !== excludeSelectEl)
		.map(select => select.value);
	return Object.keys(DATA.npcs).filter(key => !chosenElsewhere.includes(key));
}

function refreshNPCOptions() {
	for (const select of containerEl.querySelectorAll('.npcRowSelect')) {
		const currentValue = select.value;
		const availableKeys = getAvailableNPCKeys(select);
		select.innerHTML = '';
		for (const key of availableKeys) {
			select.add(new Option(DATA.npcs[key].name, key));
		}
		if (availableKeys.includes(currentValue)) select.value = currentValue;
	}
}

function updateAddButtonState() {
	const rowCount = containerEl.querySelectorAll('.npc-row').length;
	const totalNPCs = Object.keys(DATA.npcs).length;
	addBtnEl.hidden = rowCount >= totalNPCs;
	addBtnEl.textContent = rowCount === 0 ? 'Select an NPC' : 'Add another NPC';
}

// Rebuilds the Active Form field to match whichever NPC is chosen in this row,
// removing it entirely for NPCs that have no forms.
function populateFormField(npcSelect, row, presetFormKey) {
	const existingFormField = row.querySelector('.npcFormField');
	const npc = DATA.npcs[npcSelect.value];

	if (!npc.forms) {
		existingFormField?.remove();
		return;
	}

	const formField = existingFormField ?? document.createElement('div');
	formField.className = 'field npcFormField';
	const formLabel = document.createElement('label');
	formLabel.textContent = 'Active Form';
	const formSelect = document.createElement('select');
	formSelect.className = 'npcFormRowSelect';
	formSelect.addEventListener('change', persistNPCRows);
	formField.replaceChildren(formLabel, formSelect);

	for (const formKey of Object.keys(npc.forms)) {
		formSelect.add(new Option(WEREWOLF_FORMS[formKey], formKey));
	}
	if (presetFormKey && npc.forms[presetFormKey]) {
		formSelect.value = presetFormKey;
	}

	// Insert before the remove button (if it exists yet) so it stays the row's
	// 2nd child for CSS grid targeting, rather than landing after it.
	if (!existingFormField) {
		const removeBtn = row.querySelector('.removeRowBtn');
		if (removeBtn) row.insertBefore(formField, removeBtn);
		else row.append(formField);
	}
}

function createNPCRow(presetNPCKey, presetFormKey) {
	const row = document.createElement('div');
	row.className = 'npc-row';

	const npcField = document.createElement('div');
	npcField.className = 'field';
	const npcLabel = document.createElement('label');
	npcLabel.textContent = 'NPC';
	const npcSelect = document.createElement('select');
	npcSelect.className = 'npcRowSelect';
	for (const key of getAvailableNPCKeys(npcSelect)) {
		npcSelect.add(new Option(DATA.npcs[key].name, key));
	}
	if (presetNPCKey) npcSelect.value = presetNPCKey;
	npcField.append(npcLabel, npcSelect);

	row.append(npcField);
	populateFormField(npcSelect, row, presetFormKey);

	npcSelect.addEventListener('change', () => {
		populateFormField(npcSelect, row);
		refreshNPCOptions();
		persistNPCRows();
	});

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'removeRowBtn';
	removeBtn.textContent = '✕';
	removeBtn.addEventListener('click', () => {
		row.remove();
		refreshNPCOptions();
		updateAddButtonState();
		persistNPCRows();
	});
	row.append(removeBtn);

	containerEl.append(row);
}

function persistNPCRows() {
	const rows = [...containerEl.querySelectorAll('.npc-row')].map(row => ({
		npc: row.querySelector('.npcRowSelect').value,
		form: row.querySelector('.npcFormRowSelect')?.value ?? '',
	}));
	setNPCRows(rows);
}

function restoreNPCRows() {
	const stored = getNPCRows();

	const validRows = stored.filter(entry => {
		const npc = DATA.npcs[entry.npc];
		if (!npc) return false;
		return !npc.forms || npc.forms[entry.form];
	});

	for (const { npc, form } of validRows) createNPCRow(npc, form);
	refreshNPCOptions();
	updateAddButtonState();
}
