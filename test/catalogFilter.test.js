import assert from 'node:assert/strict';
import test from 'node:test';

import { getRoute, navigateTo } from '../admin/routing.js';
import {
	getCatalogFilterOptions,
	isKnownFilterValue,
	matchesCatalogFilter,
	NO_SUBCATEGORY_FILTER,
} from '../admin/ui/catalogFilter.js';

const subcategories = [
	{ id: 'a', name: 'Talens' },
	{ id: 'b', name: 'Empty' },
];
const elements = [
	{ subcategory_id: 'a' },
	{ subcategory_id: 'a' },
	{ subcategory_id: null },
];

test('builds filter options with counts, empty subcategories, and No subcategory', () => {
	assert.deepEqual(
		getCatalogFilterOptions(subcategories, elements, 'All Items'),
		[
			{ value: '', label: 'All Items (3)' },
			{ value: 'a', label: 'Talens (2)' },
			{ value: 'b', label: 'Empty (0)' },
			{ value: NO_SUBCATEGORY_FILTER, label: 'No subcategory (1)' },
		],
	);
});

test('returns no options when the category has no subcategories', () => {
	assert.deepEqual(getCatalogFilterOptions([], elements), []);
});

test('matches all, a subcategory, and uncategorized elements', () => {
	assert.ok(elements.every(element => matchesCatalogFilter(element, '')));
	assert.equal(matchesCatalogFilter(elements[0], 'a'), true);
	assert.equal(matchesCatalogFilter(elements[2], 'a'), false);
	assert.equal(
		matchesCatalogFilter(elements[2], NO_SUBCATEGORY_FILTER),
		true,
	);
	assert.equal(
		matchesCatalogFilter(elements[0], NO_SUBCATEGORY_FILTER),
		false,
	);
});

test('recognizes only existing filter values', () => {
	assert.equal(isKnownFilterValue('', subcategories), true);
	assert.equal(
		isKnownFilterValue(NO_SUBCATEGORY_FILTER, subcategories),
		true,
	);
	assert.equal(isKnownFilterValue('a', subcategories), true);
	assert.equal(isKnownFilterValue('gone', subcategories), false);
});

test('parses the subcategory query from view routes', () => {
	assert.deepEqual(getRoute('#/view/item?sub=abc'), {
		name: 'view',
		category: 'item',
		subcategory: 'abc',
	});
	assert.deepEqual(getRoute('#/view/item'), {
		name: 'view',
		category: 'item',
		subcategory: '',
	});
	assert.equal(getRoute('#/edit/item/my-slug').slug, 'my-slug');
});

test('writes the subcategory query into view hashes only when set', () => {
	globalThis.window = { location: { hash: '' } };
	navigateTo({ name: 'view', category: 'item', subcategory: 'abc' });
	assert.equal(window.location.hash, '#/view/item?sub=abc');
	navigateTo({ name: 'view', category: 'item' });
	assert.equal(window.location.hash, '#/view/item');
	delete globalThis.window;
});
