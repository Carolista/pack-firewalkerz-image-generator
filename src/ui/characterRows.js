import { getElements } from '../services/catalog.js';
import { getCharacterRows, setCharacterRows } from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function initCharacterRows({ container, addBtn, onPreview }) {
	controller = initVariantRows({
		container,
		addBtn,
		elements: getElements('character'),
		rowClassName: 'character-row',
		elementSelectClassName: 'char-row-select',
		variantSelectClassName: 'variant-row-select',
		allowDuplicates: false,
		getStoredRows: getCharacterRows,
		setStoredRows: setCharacterRows,
		entityLabel: 'Character',
		entityArticle: 'a',
		onPreview,
		showVariantWhenSingleVariant: true,
	});
}

export function getCharacterSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
