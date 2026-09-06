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
	const expectedVariant = enemy.variants.find(
		({ variantName }) => variantName === 'On Patrol',
	);
	const variant = getVariantById(enemy, expectedVariant.variantId);

	assert.equal(variant.variantName, 'On Patrol');
});

test('returns undefined for an unknown variant ID', () => {
	const character = getElements('character')[0];

	assert.equal(getVariantById(character, 'missing-variant-id'), undefined);
});

test('rejects an unknown catalog element type', () => {
	assert.throws(
		() => getElements('vehicle'),
		/Unknown catalog element type: vehicle/,
	);
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

test('sorts elements alphabetically by name', () => {
	assert.deepEqual(
		getElements('character').map(element => element.name),
		['Lorica Albrecht', 'Monkshood', 'River-That-Remembers'],
	);
});

test('sorts unordered variants alphabetically', () => {
	const catalog = normalizeCatalog({
		characters: [
			{
				id: 'character-id',
				name: 'Test Character',
				slug: 'test-character',
				variants: [
					{
						variantId: 'z',
						variantName: 'Zulu',
						variantDesc: '',
						image: '',
					},
					{
						variantId: 'a',
						variantName: 'Alpha',
						variantDesc: '',
						image: '',
					},
				],
			},
		],
		npcs: [],
		enemies: [],
		locations: [],
	});

	assert.deepEqual(
		catalog.characters[0].variants.map(variant => variant.variantName),
		['Alpha', 'Zulu'],
	);
});

test('sorts explicit variants numerically before unordered variants', () => {
	const catalog = normalizeCatalog({
		characters: [
			{
				id: 'character-id',
				name: 'Test Character',
				slug: 'test-character',
				variants: [
					{
						variantId: 'late',
						variantName: 'Late',
						variantDesc: '',
						image: '',
						sortOrder: 2,
					},
					{
						variantId: 'early',
						variantName: 'Early',
						variantDesc: '',
						image: '',
						sortOrder: 1,
					},
					{
						variantId: 'default',
						variantName: 'Default',
						variantDesc: '',
						image: '',
					},
				],
			},
		],
		npcs: [],
		enemies: [],
		locations: [],
	});

	assert.deepEqual(
		catalog.characters[0].variants.map(variant => variant.variantName),
		['Early', 'Late', 'Default'],
	);
});

test('rejects an element without an id', () => {
	assert.throws(
		() =>
			assertCatalog({
				characters: [
					{
						name: 'Missing ID',
						variants: [],
					},
				],
				npcs: [],
				enemies: [],
				locations: [],
			}),
		/Invalid game element/,
	);
});

test('rejects an element without variants', () => {
	assert.throws(
		() =>
			assertCatalog({
				characters: [
					{
						id: 'character-id',
						name: 'Missing variants',
						variants: [],
					},
				],
				npcs: [],
				enemies: [],
				locations: [],
			}),
		/Invalid game element/,
	);
});

test('rejects invalid variant fields', () => {
	const invalidVariants = [
		{ variantName: 'Missing ID', variantDesc: '', image: '' },
		{ variantId: 'missing-name', variantDesc: '', image: '' },
		{
			variantId: 'bad-desc',
			variantName: 'Bad',
			variantDesc: null,
			image: '',
		},
		{
			variantId: 'bad-image',
			variantName: 'Bad',
			variantDesc: '',
			image: null,
		},
		{
			variantId: 'bad-sort',
			variantName: 'Bad',
			variantDesc: '',
			image: '',
			sortOrder: 1.5,
		},
		{
			variantId: 'negative-sort',
			variantName: 'Bad',
			variantDesc: '',
			image: '',
			sortOrder: -1,
		},
	];

	for (const variant of invalidVariants) {
		assert.throws(
			() =>
				assertCatalog({
					characters: [
						{
							id: 'character-id',
							name: 'Invalid variant',
							variants: [variant],
						},
					],
					npcs: [],
					enemies: [],
					locations: [],
				}),
			/Invalid variant/,
		);
	}
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
