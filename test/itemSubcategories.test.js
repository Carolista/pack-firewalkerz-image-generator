import assert from 'node:assert/strict';
import test from 'node:test';

import {
	getSubcategoryFilterOptions,
	matchesSubcategoryFilter,
	OTHER_SUBCATEGORY_FILTER,
} from '../src/ui/itemRows.js';
import { getFilteredSelectionId } from '../src/ui/variantRows.js';

const elements = [
	{ id: 'a', subcategoryId: 'talens', subcategoryName: 'Talens' },
	{ id: 'b', subcategoryId: 'personal', subcategoryName: 'Personal Items' },
	{ id: 'c', subcategoryId: null, subcategoryName: null },
];

test('builds sorted subcategory filter options with UI-only Other', () => {
	assert.deepEqual(getSubcategoryFilterOptions(elements), [
		{ value: '', label: 'All items' },
		{ value: 'personal', label: 'Personal Items' },
		{ value: 'talens', label: 'Talens' },
		{ value: OTHER_SUBCATEGORY_FILTER, label: 'Other' },
	]);
});

test('omits Other when every item has a subcategory', () => {
	assert.deepEqual(
		getSubcategoryFilterOptions(elements.slice(0, 2)).map(
			({ label }) => label,
		),
		['All items', 'Personal Items', 'Talens'],
	);
});

test('matches all, named subcategory, and uncategorized items', () => {
	assert.ok(elements.every(element => matchesSubcategoryFilter(element, '')));
	assert.equal(matchesSubcategoryFilter(elements[0], 'talens'), true);
	assert.equal(matchesSubcategoryFilter(elements[1], 'talens'), false);
	assert.equal(
		matchesSubcategoryFilter(elements[2], OTHER_SUBCATEGORY_FILTER),
		true,
	);
	assert.equal(
		matchesSubcategoryFilter(elements[0], OTHER_SUBCATEGORY_FILTER),
		false,
	);
});

test('keeps an in-filter selection and replaces an excluded one with the first match', () => {
	const matchesTalens = element =>
		matchesSubcategoryFilter(element, 'talens');

	assert.equal(getFilteredSelectionId(elements, 'a', matchesTalens), 'a');
	assert.equal(getFilteredSelectionId(elements, 'b', matchesTalens), 'a');
});

test('restores the remembered item for a filter before using the current item', () => {
	const matchesPersonal = element =>
		matchesSubcategoryFilter(element, 'personal');

	assert.equal(
		getFilteredSelectionId(elements, 'b', matchesPersonal, 'b'),
		'b',
	);
	assert.equal(
		getFilteredSelectionId(elements, 'a', matchesPersonal, 'b'),
		'b',
	);
});

test('keeps the current item when switching back to All Items', () => {
	assert.equal(
		getFilteredSelectionId(elements, 'b', () => true, 'a', true),
		'b',
	);
});
