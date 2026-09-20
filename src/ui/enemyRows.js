import { MAX_ENEMY_ROWS } from '../constants.js';
import { getElements } from '../services/catalog.js';
import { getEnemyRows, setEnemyRows } from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function initEnemyRows({ container, addBtn, onPreview }) {
	controller = initVariantRows({
		container,
		addBtn,
		elements: getElements('enemy'),
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
	});
}

export function getEnemySelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
