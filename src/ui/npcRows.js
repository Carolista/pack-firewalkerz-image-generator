import { WEREWOLF_VARIANTS } from '../constants.js';
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
		const variantSelect = row.querySelector('.npcVariantRowSelect');

		if (!variantSelect) {
			return { name: npc.name, description: npc.description };
		}

		const variantKey = variantSelect.value;
		const variant = npc.variants[variantKey];
		return {
			name: npc.name,
			variantKey,
			variantName: WEREWOLF_VARIANTS[variantKey],
			description: variant.description,
			imageFile: variant.imageFile,
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

// Rebuilds the Variant field to match whichever NPC is chosen in this row,
// removing it entirely for NPCs that have no variants.
function populateVariantField(npcSelect, row, presetVariantKey) {
	const existingVariantField = row.querySelector('.npcVariantField');
	const npc = DATA.npcs[npcSelect.value];

	if (!npc.variants) {
		existingVariantField?.remove();
		return;
	}

	const variantField = existingVariantField ?? document.createElement('div');
	variantField.className = 'field npcVariantField';
	const variantLabel = document.createElement('label');
	variantLabel.textContent = 'Variant';
	const variantSelect = document.createElement('select');
	variantSelect.className = 'npcVariantRowSelect';
	variantSelect.addEventListener('change', persistNPCRows);
	variantField.replaceChildren(variantLabel, variantSelect);

	for (const variantKey of Object.keys(npc.variants)) {
		variantSelect.add(
			new Option(WEREWOLF_VARIANTS[variantKey], variantKey),
		);
	}
	if (presetVariantKey && npc.variants[presetVariantKey]) {
		variantSelect.value = presetVariantKey;
	}

	// Insert before the remove button (if it exists yet) so it stays the row's
	// 2nd child for CSS grid targeting, rather than landing after it.
	if (!existingVariantField) {
		const removeBtn = row.querySelector('.removeRowBtn');
		if (removeBtn) row.insertBefore(variantField, removeBtn);
		else row.append(variantField);
	}
}

function createNPCRow(presetNPCKey, presetVariantKey) {
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
	populateVariantField(npcSelect, row, presetVariantKey);

	npcSelect.addEventListener('change', () => {
		populateVariantField(npcSelect, row);
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
		variant: row.querySelector('.npcVariantRowSelect')?.value ?? '',
	}));
	setNPCRows(rows);
}

function restoreNPCRows() {
	const stored = getNPCRows();

	const validRows = stored.filter(entry => {
		const npc = DATA.npcs[entry.npc];
		if (!npc) return false;
		return !npc.variants || npc.variants[entry.variant];
	});

	for (const { npc, variant } of validRows) createNPCRow(npc, variant);
	refreshNPCOptions();
	updateAddButtonState();
}
