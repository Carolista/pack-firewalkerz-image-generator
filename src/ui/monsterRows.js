import { MAX_MONSTER_ROWS } from '../constants.js';
import DATA from '../data.json' with { type: 'json' };
import { getMonsterRows, setMonsterRows } from '../services/storage.js';
import { initSimpleSelectRows } from './simpleSelectRows.js';

let controller;

export function initMonsterRows({ container, addBtn }) {
	controller = initSimpleSelectRows({
		container,
		addBtn,
		dataMap: DATA.monsters,
		rowClassName: 'monster-row',
		selectClassName: 'monsterRowSelect',
		maxRows: MAX_MONSTER_ROWS,
		getStoredRows: getMonsterRows,
		setStoredRows: setMonsterRows,
		entityLabel: 'monster',
		entityArticle: 'a',
	});
}

export function getMonsterSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
