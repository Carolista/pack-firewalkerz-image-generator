import { MAX_ENEMY_ROWS } from '../constants.js';
import DATA from '../data.json' with { type: 'json' };
import { getEnemyRows, setEnemyRows } from '../services/storage.js';
import { initSimpleSelectRows } from './simpleSelectRows.js';

let controller;

export function initEnemyRows({ container, addBtn }) {
	controller = initSimpleSelectRows({
		container,
		addBtn,
		dataMap: DATA.enemys,
		rowClassName: 'enemy-row',
		selectClassName: 'enemyRowSelect',
		maxRows: MAX_ENEMY_ROWS,
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
