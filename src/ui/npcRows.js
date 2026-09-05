import { MAX_NPC_ROWS } from '../constants.js';
import DATA from '../data.json' with { type: 'json' };
import { getNPCRows, setNPCRows } from '../services/storage.js';
import { initSimpleSelectRows } from './simpleSelectRows.js';

let controller;

export function initNPCRows({ container, addBtn }) {
	controller = initSimpleSelectRows({
		container,
		addBtn,
		dataMap: DATA.npcs,
		rowClassName: 'npc-row',
		selectClassName: 'npcRowSelect',
		maxRows: MAX_NPC_ROWS,
		getStoredRows: getNPCRows,
		setStoredRows: setNPCRows,
		entityLabel: 'NPC',
		entityArticle: 'an',
		excludeChosen: true,
	});
}

export function getNPCSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
