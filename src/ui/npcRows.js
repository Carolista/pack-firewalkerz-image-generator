import { MAX_NPC_ROWS } from '../constants.js';
import { getElements } from '../services/catalog.js';
import { getNPCRows, setNPCRows } from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function initNPCRows({ container, addBtn }) {
	controller = initVariantRows({
		container,
		addBtn,
		elements: getElements('npc'),
		rowClassName: 'npc-row',
		elementSelectClassName: 'npcRowSelect',
		variantSelectClassName: 'npcVariantRowSelect',
		maxRows: MAX_NPC_ROWS,
		allowDuplicates: false,
		getStoredRows: getNPCRows,
		setStoredRows: setNPCRows,
		entityLabel: 'NPC',
		entityArticle: 'an',
	});
}

export function getNPCSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
