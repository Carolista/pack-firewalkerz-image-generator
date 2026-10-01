import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEnemyRowDefault } from '../src/ui/enemyRows.js';

const elements = [
	{
		id: 'enemy-a',
		variants: [{ variantId: 'enemy-a-form' }],
	},
	{
		id: 'enemy-b',
		variants: [
			{ variantId: 'enemy-b-first' },
			{ variantId: 'enemy-b-second' },
		],
	},
];

test('uses the last explicitly selected enemy and variant', () => {
	const selection = { elementId: 'enemy-b', variantId: 'enemy-b-second' };
	assert.deepEqual(
		resolveEnemyRowDefault(elements, selection, []),
		selection,
	);
});

test('falls back to the last valid stored row when the remembered pair is stale', () => {
	const rows = [
		{ elementId: 'enemy-a', variantId: 'enemy-a-form' },
		{ elementId: 'missing-enemy', variantId: 'missing-variant' },
	];

	assert.deepEqual(
		resolveEnemyRowDefault(
			elements,
			{ elementId: 'enemy-b', variantId: 'deleted-variant' },
			rows,
		),
		rows[0],
	);
});

test('returns null when there is no valid saved selection', () => {
	assert.equal(
		resolveEnemyRowDefault(elements, null, [
			{ elementId: 'missing-enemy', variantId: 'missing-variant' },
		]),
		null,
	);
});
