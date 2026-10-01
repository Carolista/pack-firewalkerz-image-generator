import { MAX_ITEM_ROWS } from '../constants.js';
import { getElements } from '../services/catalog.js';
import {
	getItemFilterSelections,
	getItemRows,
	setItemFilterSelections,
	setItemRows,
} from '../services/storage.js';
import { initVariantRows } from './variantRows.js';

export const OTHER_SUBCATEGORY_FILTER = '__other__';

let controller;

export function getSubcategoryFilterOptions(elements) {
	const subcategories = new Map();
	for (const element of elements) {
		if (element.subcategoryId && element.subcategoryName) {
			subcategories.set(element.subcategoryId, element.subcategoryName);
		}
	}
	const options = [
		{ value: '', label: 'All items' },
		...[...subcategories]
			.sort((left, right) =>
				left[1].localeCompare(right[1], undefined, {
					sensitivity: 'base',
				}),
			)
			.map(([value, label]) => ({ value, label })),
	];
	if (elements.some(element => !element.subcategoryId)) {
		options.push({ value: OTHER_SUBCATEGORY_FILTER, label: 'Other' });
	}
	return options;
}

export function matchesSubcategoryFilter(element, filterValue) {
	if (!filterValue) return true;
	if (filterValue === OTHER_SUBCATEGORY_FILTER) return !element.subcategoryId;
	return element.subcategoryId === filterValue;
}

export function initItemRows({
	container,
	addBtn,
	onPreview,
	filterField,
	filterSelect,
}) {
	const elements = getElements('item');
	const filterOptions = getSubcategoryFilterOptions(elements);
	filterSelect.replaceChildren(
		...filterOptions.map(({ value, label }) => new Option(label, value)),
	);
	filterField.hidden = !elements.some(element => element.subcategoryId);
	controller = initVariantRows({
		container,
		addBtn,
		elements,
		rowClassName: 'item-row',
		elementSelectClassName: 'item-row-select',
		variantSelectClassName: 'item-variant-row-select',
		maxRows: MAX_ITEM_ROWS,
		allowDuplicates: true,
		getStoredRows: getItemRows,
		setStoredRows: setItemRows,
		getFilterSelections: getItemFilterSelections,
		setFilterSelections: setItemFilterSelections,
		entityLabel: 'Item',
		entityArticle: 'an',
		onPreview,
		filterSelect,
		matchesFilter: element =>
			matchesSubcategoryFilter(element, filterSelect.value),
	});
}

export function getItemSelections() {
	return controller.getSelections();
}

export function hasAtLeastOneRow() {
	return controller.hasAtLeastOneRow();
}
