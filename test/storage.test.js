import assert from 'node:assert/strict';
import test from 'node:test';

import {
	CHARACTER_ROWS_STORAGE_KEY,
	ITEM_FILTER_SELECTIONS_STORAGE_KEY,
	ITEM_ROWS_STORAGE_KEY,
	LAST_ENEMY_SELECTION_STORAGE_KEY,
	STORAGE_SCHEMA_VERSION,
} from '../src/constants.js';
import {
	getCharacterRows,
	getItemFilterSelections,
	getItemRows,
	getLastEnemySelection,
	setCharacterRows,
	setItemFilterSelections,
	setItemRows,
	setLastEnemySelection,
} from '../src/services/storage.js';

const values = new Map();
globalThis.localStorage = {
	getItem(key) {
		return values.get(key) ?? null;
	},
	setItem(key, value) {
		values.set(key, value);
	},
	removeItem(key) {
		values.delete(key);
	},
};

test.beforeEach(() => values.clear());

test('stores and reads versioned row data', () => {
	const rows = [{ elementId: 'character-id', variantId: 'variant-id' }];
	setCharacterRows(rows);

	assert.deepEqual(getCharacterRows(), rows);
	assert.deepEqual(JSON.parse(values.get(CHARACTER_ROWS_STORAGE_KEY)), {
		version: STORAGE_SCHEMA_VERSION,
		data: rows,
	});
});

test('stores duplicate item rows with stable IDs', () => {
	const row = { elementId: 'item-id', variantId: 'keys-variant-id' };
	setItemRows([row, row]);

	assert.deepEqual(getItemRows(), [row, row]);
	assert.deepEqual(JSON.parse(values.get(ITEM_ROWS_STORAGE_KEY)), {
		version: STORAGE_SCHEMA_VERSION,
		data: [row, row],
	});
});

test('stores the last enemy and variant selection', () => {
	const selection = { elementId: 'enemy-id', variantId: 'variant-id' };
	setLastEnemySelection(selection);

	assert.deepEqual(getLastEnemySelection(), selection);
	assert.deepEqual(JSON.parse(values.get(LAST_ENEMY_SELECTION_STORAGE_KEY)), {
		version: STORAGE_SCHEMA_VERSION,
		data: selection,
	});
});

test('stores item selections separately for each filter group', () => {
	const selections = {
		__all__: [{ elementId: 'all-item', variantId: 'all-variant' }],
		personal: [
			{ elementId: 'personal-item', variantId: 'personal-variant' },
		],
	};
	setItemFilterSelections(selections);

	assert.deepEqual(getItemFilterSelections(), selections);
	assert.deepEqual(
		JSON.parse(values.get(ITEM_FILTER_SELECTIONS_STORAGE_KEY)),
		{ version: STORAGE_SCHEMA_VERSION, data: selections },
	);
});

test('ignores and removes rows from an old storage schema', () => {
	values.set(
		CHARACTER_ROWS_STORAGE_KEY,
		JSON.stringify({ version: STORAGE_SCHEMA_VERSION - 1, data: ['old'] }),
	);

	assert.deepEqual(getCharacterRows(), []);
	assert.equal(values.has(CHARACTER_ROWS_STORAGE_KEY), false);
});

test('ignores malformed stored rows', () => {
	values.set(CHARACTER_ROWS_STORAGE_KEY, '{not-json');

	assert.deepEqual(getCharacterRows(), []);
	assert.equal(values.has(CHARACTER_ROWS_STORAGE_KEY), false);
});
