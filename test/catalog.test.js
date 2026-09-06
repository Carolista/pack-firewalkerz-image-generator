import assert from 'node:assert/strict';
import test from 'node:test';

import DATA from '../src/data.json' with { type: 'json' };
import { assertCatalog, normalizeCatalog } from '../src/model/gameElements.js';
import { buildPrompt } from '../src/prompt.js';
import { getElements, getVariantById } from '../src/services/catalog.js';

test('normalizes and validates the catalog', () => {
	const catalog = assertCatalog(normalizeCatalog(DATA));

	assert.equal(catalog.characters.length, 3);
	assert.equal(catalog.npcs.length, 3);
	assert.equal(catalog.enemies.length, 3);
	assert.equal(catalog.locations.length, 3);

	for (const elements of Object.values(catalog)) {
		for (const element of elements) {
			assert.ok(element.id);
			assert.ok(element.slug);
			assert.ok(element.variants.length > 0);
		}
	}
});

test('looks up a variant by stable ID', () => {
	const enemy = getElements('enemy').find(
		({ slug }) => slug === 'securityBot',
	);
	const variant = getVariantById(enemy, enemy.variants[0].variantId);

	assert.equal(variant.variantName, 'On Patrol');
});

test('preserves werewolf variant sort order', () => {
	const character = getElements('character').find(
		({ slug }) => slug === 'river',
	);

	assert.deepEqual(
		character.variants.map(variant => variant.sortOrder),
		[1, 2, 3, 4, 5],
	);
});

test('renders normalized variant selections in the prompt', () => {
	const prompt = buildPrompt({
		characters: [],
		npcs: [],
		enemies: [
			{
				elementName: 'Security Bot',
				variantName: 'On Patrol',
				variantDesc: 'A security bot on patrol.',
			},
		],
		locationDesc: 'A city alley.',
		scene: 'The bot searches the alley.',
	});

	assert.match(prompt, /Enemy: Security Bot in On Patrol variant/);
	assert.match(prompt, /The bot searches the alley/);
});

test('renders the selected location variant in the prompt', () => {
	const prompt = buildPrompt({
		characters: [],
		npcs: [],
		enemies: [],
		location: {
			elementName: 'Appalachian Woods',
			variantName: 'Nighttime',
			variantDesc: 'A dark forest under the moon.',
		},
		scene: 'The pack watches the tree line.',
	});

	assert.match(
		prompt,
		/Environment\/Setting: Appalachian Woods \(Nighttime\): A dark forest/,
	);
});
