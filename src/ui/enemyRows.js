import { getElements } from '../services/catalog.js';
import { getEnemyRows, setEnemyRows } from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function initEnemyRows({ container, addBtn }) {
	controller = initVariantRows({
		container,
		addBtn,
		elements: getElements('enemy'),
		rowClassName: 'enemy-row',
		elementSelectClassName: 'enemyRowSelect',
		variantSelectClassName: 'enemyVariantRowSelect',
		maxRows: 10,
		allowDuplicates: true,
		getStoredRows: getEnemyRows,
		setStoredRows: setEnemyRows,
		entityLabel: 'enemy',
		entityArticle: 'an',
	});
}

export function getEnemySelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
