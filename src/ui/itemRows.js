import { MAX_ITEM_ROWS } from '../constants.js';
import { getElements } from '../services/catalog.js';
import { getItemRows, setItemRows } from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

let controller;

export function initItemRows({ container, addBtn, onPreview }) {
	controller = initVariantRows({
		container,
		addBtn,
		elements: getElements('item'),
		rowClassName: 'item-row',
		elementSelectClassName: 'item-row-select',
		variantSelectClassName: 'item-variant-row-select',
		maxRows: MAX_ITEM_ROWS,
		allowDuplicates: true,
		getStoredRows: getItemRows,
		setStoredRows: setItemRows,
		entityLabel: 'Item',
		entityArticle: 'an',
		onPreview,
	});
}

export function getItemSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
