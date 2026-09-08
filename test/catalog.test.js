import assert from 'node:assert/strict';
import test from 'node:test';

import DATA from '../src/data.json' with { type: 'json' };
import { assertCatalog, normalizeCatalog } from '../src/model/gameElements.js';
import {
	buildPrompt,
	isLocationReferenceMode,
	isReferenceModeLocation,
} from '../src/prompt.js';
import { getElements, getVariantById } from '../src/services/catalog.js';

test('normalizes and validates the catalog', () => {
	const catalog = assertCatalog(normalizeCatalog(DATA));

	assert.equal(catalog.characters.length, 3);
	assert.equal(catalog.npcs.length, 3);
	assert.equal(catalog.enemies.length, 3);
	assert.equal(catalog.locations.length, 4);

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

test('includes Neutral Void location in the catalog', () => {
	const catalog = assertCatalog(normalizeCatalog(DATA));
	const neutralVoid = catalog.locations.find(
		loc => loc.slug === 'neutral-void',
	);

	assert.ok(neutralVoid, 'Neutral Void location should exist');
	assert.equal(neutralVoid.name, 'Neutral Void');
	assert.equal(neutralVoid.variants.length, 1);
	assert.equal(neutralVoid.variants[0].variantName, 'default');
	assert.match(
		neutralVoid.variants[0].variantDesc,
		/neutral void.*generic background.*render the individual form/i,
	);
});

test('detects reference mode for Neutral Void location', () => {
	const neutralVoidLocation = {
		elementId: 'test-id',
		elementName: 'Neutral Void',
		slug: 'neutral-void',
		variantName: 'default',
		variantDesc: 'A neutral void...',
	};

	assert.ok(isReferenceModeLocation(neutralVoidLocation));
});

test('does not detect reference mode for normal locations', () => {
	const normalLocation = {
		elementId: 'test-id',
		elementName: 'Appalachian Woods',
		slug: 'appalachianWoods',
		variantName: 'Nighttime',
		variantDesc: 'A dark forest...',
	};

	assert.ok(!isReferenceModeLocation(normalLocation));
});

test('renders reference mode prompt with no entities', () => {
	const prompt = buildPrompt({
		characters: [],
		npcs: [],
		enemies: [],
		location: {
			elementName: 'Neutral Void',
			variantName: 'default',
			variantDesc:
				"A neutral void to be used as a generic background for reference images with PCs, NPCs, and enemies. Keep this exact background and render the individual form of the character, NPC, or enemy in the foreground based on the variant's description.",
			slug: 'neutral-void',
		},
		scene: 'A warrior in full plate armor, standing at attention.',
	});

	assert.match(prompt, /render exactly one individual/i);
	assert.match(prompt, /A warrior in full plate armor/);
	assert.match(prompt, /Keep the Neutral Void background unchanged/i);
	assert.match(prompt, /Do not modify or replace the background/);
});

test('renders normal prompt with Neutral Void and existing entities', () => {
	const prompt = buildPrompt({
		characters: [
			{
				elementName: 'River-That-Remembers',
				variantName: 'Crinos (Werewolf)',
				variantDesc: 'A large werewolf form...',
			},
		],
		npcs: [],
		enemies: [],
		location: {
			elementName: 'Neutral Void',
			variantName: 'default',
			variantDesc: 'A neutral void...',
			slug: 'neutral-void',
		},
		scene: 'Standing in the void.',
	});

	// With entities, should use normal mode even with Neutral Void
	assert.match(prompt, /Character: River-That-Remembers/);
	assert.match(prompt, /Environment\/Setting: Neutral Void:/);
	assert.match(prompt, /Action\/Scene: Standing in the void/);
});

test('detects location reference mode', () => {
	const locationRefMode = {
		elementId: 'custom-location-reference',
		elementName: 'Custom location (reference)',
		variantName: 'reference',
		variantDesc: 'A mystical forest temple...',
	};

	assert.ok(isLocationReferenceMode(locationRefMode));
});

test('does not detect location reference mode for normal locations', () => {
	const normalLocation = {
		elementId: 'appalachian-id',
		elementName: 'Appalachian Woods',
		variantName: 'Daytime',
		variantDesc: 'A misty forest...',
		slug: 'appalachianWoods',
	};

	assert.ok(!isLocationReferenceMode(normalLocation));
});

test('renders location reference mode prompt', () => {
	const prompt = buildPrompt({
		characters: [],
		npcs: [],
		enemies: [],
		location: {
			elementId: 'custom-location-reference',
			elementName: 'Custom location (reference)',
			variantName: 'reference',
			variantDesc:
				'A misty old-growth forest surrounding a stone chapel and a cold mountain stream.',
		},
		locationDesc:
			'A misty old-growth forest surrounding a stone chapel and a cold mountain stream.',
		scene: '',
	});

	assert.match(
		prompt,
		/Detailed, atmospheric, painterly digital illustration/,
	);
	assert.match(
		prompt,
		/faithfully render all details it describes, whether natural, architectural, cultural, or civilized/,
	);
	assert.match(
		prompt,
		/Do not add unrelated subjects, creatures, themes, or visual motifs/,
	);
	assert.ok(!prompt.includes('World of Darkness'));
	assert.ok(!prompt.includes('fantasy'));
	assert.match(
		prompt,
		/Location: A misty old-growth forest surrounding a stone chapel and a cold mountain stream/,
	);
	assert.ok(!prompt.includes('Render exactly one individual'));
	assert.ok(!prompt.includes('Action\/Scene'));
	assert.ok(!prompt.includes('Environment\/Setting'));
});
