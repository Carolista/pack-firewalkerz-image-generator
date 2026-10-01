import { MAX_ENEMY_ROWS } from '../constants.js';
import { getElements } from '../services/catalog.js';
import {
	getEnemyRows,
	getLastEnemySelection,
	setEnemyRows,
	setLastEnemySelection,
} from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function resolveEnemyRowDefault(elements, lastSelection, rows) {
	const isValidSelection = selection => {
		const element = elements.find(item => item.id === selection?.elementId);
		return element?.variants.some(
			variant => variant.variantId === selection?.variantId,
		);
	};
	if (isValidSelection(lastSelection)) return lastSelection;
	if (Array.isArray(rows)) {
		const lastValidRow = [...rows].reverse().find(isValidSelection);
		if (lastValidRow) return lastValidRow;
	}
	return null;
}

export function initEnemyRows({ container, addBtn, onPreview }) {
	const elements = getElements('enemy');
	controller = initVariantRows({
		container,
		addBtn,
		elements,
		rowClassName: 'enemy-row',
		elementSelectClassName: 'enemy-row-select',
		variantSelectClassName: 'enemy-variant-row-select',
		maxRows: MAX_ENEMY_ROWS,
		allowDuplicates: true,
		getStoredRows: getEnemyRows,
		setStoredRows: setEnemyRows,
		entityLabel: 'Enemy',
		entityArticle: 'an',
		onPreview,
		getAddRowSelection: () =>
			resolveEnemyRowDefault(
				elements,
				getLastEnemySelection(),
				getEnemyRows(),
			),
		onSelectionChange: setLastEnemySelection,
	});
}

export function getEnemySelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
