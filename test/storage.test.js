import assert from 'node:assert/strict';
import test from 'node:test';

import {
	CHARACTER_ROWS_STORAGE_KEY,
	STORAGE_SCHEMA_VERSION,
} from '../src/constants.js';
import { getCharacterRows, setCharacterRows } from '../src/services/storage.js';

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
