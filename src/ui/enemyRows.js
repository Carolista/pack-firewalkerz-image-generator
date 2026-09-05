import { MAX_ENEMY_ROWS } from '../constants.js';
import DATA from '../data.json' with { type: 'json' };
import { getEnemyRows, setEnemyRows } from '../services/storage.js';

let containerEl;
let addBtnEl;

export function initEnemyRows({ container, addBtn }) {
	containerEl = container;
	addBtnEl = addBtn;

	addBtnEl.addEventListener('click', () => {
		createEnemyRow();
		updateAddButtonState();
		persistEnemyRows();
	});

	restoreEnemyRows();
}

export function getEnemySelections() {
	return [...containerEl.querySelectorAll('.enemy-row')].map(row => {
		const enemyKey = row.querySelector('.enemyRowSelect').value;
		const enemy = DATA.enemies[enemyKey];
		const variantSelect = row.querySelector('.enemyVariantRowSelect');

		if (!variantSelect) {
			return {
				name: enemy.name,
				description: enemy.description,
				imageFile: enemy.imageFile,
			};
		}

		const variantKey = variantSelect.value;
		const variant = enemy.variants[variantKey];
		return {
			name: enemy.name,
			variantKey,
			variantName: variant.name,
			description: variant.description,
			imageFile: variant.imageFile,
		};
	});
}

export function hasAtLeastOneRow() {
	return containerEl.querySelectorAll('.enemy-row').length > 0;
}

function updateAddButtonState() {
	const rowCount = containerEl.querySelectorAll('.enemy-row').length;
	addBtnEl.hidden = rowCount >= MAX_ENEMY_ROWS;
	addBtnEl.textContent =
		rowCount === 0 ? 'Select an enemy' : 'Add another enemy';
}

function populateVariantField(enemySelect, row, presetVariantKey) {
	const existingVariantField = row.querySelector('.enemyVariantField');
	const enemy = DATA.enemies[enemySelect.value];

	if (!enemy.variants) {
		existingVariantField?.remove();
		return;
	}

	const variantField = existingVariantField ?? document.createElement('div');
	variantField.className = 'field enemyVariantField';
	const variantLabel = document.createElement('label');
	variantLabel.textContent = 'Variant';
	const variantSelect = document.createElement('select');
	variantSelect.className = 'enemyVariantRowSelect';
	variantSelect.addEventListener('change', persistEnemyRows);
	variantField.replaceChildren(variantLabel, variantSelect);

	for (const [variantKey, variant] of Object.entries(enemy.variants)) {
		variantSelect.add(new Option(variant.name, variantKey));
	}
	if (presetVariantKey && enemy.variants[presetVariantKey]) {
		variantSelect.value = presetVariantKey;
	}

	if (!existingVariantField) {
		const removeBtn = row.querySelector('.removeRowBtn');
		if (removeBtn) row.insertBefore(variantField, removeBtn);
		else row.append(variantField);
	}
}

function createEnemyRow(presetEnemyKey, presetVariantKey) {
	const row = document.createElement('div');
	row.className = 'enemy-row';

	const enemyField = document.createElement('div');
	enemyField.className = 'field';
	const enemyLabel = document.createElement('label');
	enemyLabel.textContent = 'Enemy';
	const enemySelect = document.createElement('select');
	enemySelect.className = 'enemyRowSelect';
	for (const [enemyKey, enemy] of Object.entries(DATA.enemies)) {
		enemySelect.add(new Option(enemy.name, enemyKey));
	}
	if (presetEnemyKey) enemySelect.value = presetEnemyKey;
	enemyField.append(enemyLabel, enemySelect);

	row.append(enemyField);
	populateVariantField(enemySelect, row, presetVariantKey);

	enemySelect.addEventListener('change', () => {
		populateVariantField(enemySelect, row);
		persistEnemyRows();
	});

	const removeBtn = document.createElement('button');
	removeBtn.type = 'button';
	removeBtn.className = 'removeRowBtn';
	removeBtn.textContent = '✕';
	removeBtn.addEventListener('click', () => {
		row.remove();
		updateAddButtonState();
		persistEnemyRows();
	});
	row.append(removeBtn);

	containerEl.append(row);
}

function persistEnemyRows() {
	const rows = [...containerEl.querySelectorAll('.enemy-row')].map(row => ({
		enemy: row.querySelector('.enemyRowSelect').value,
		variant: row.querySelector('.enemyVariantRowSelect')?.value ?? '',
	}));
	setEnemyRows(rows);
}

function restoreEnemyRows() {
	const stored = getEnemyRows();
	const validRows = stored.filter(entry => {
		const enemy = DATA.enemies[entry.enemy];
		if (!enemy) return false;
		return !enemy.variants || enemy.variants[entry.variant];
	});

	for (const { enemy, variant } of validRows) {
		createEnemyRow(enemy, variant);
	}
	updateAddButtonState();
}
