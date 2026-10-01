import assert from 'node:assert/strict';
import test from 'node:test';

import { assertCatalog, normalizeCatalog } from '../src/model/gameElements.js';
import {
	ADMIN_CATALOG_ACTIVE,
	getElements,
	getVariantById,
	loadCatalog,
} from '../src/services/catalog.js';

const TEST_DATA = {
	characters: [
		{
			id: 'river',
			name: 'River-That-Remembers',
			slug: 'river',
			variants: [1, 2, 3, 4, 5].map(sortOrder => ({
				variantId: `river-${sortOrder}`,
				variantName: `Form ${sortOrder}`,
				variantDesc: '',
				image: '',
				sortOrder,
			})),
		},
	],
	npcs: [
		{
			id: 'mother',
			name: 'Mother',
			slug: 'mother',
			variants: [
				{
					variantId: 'mother-day',
					variantName: 'Day',
					variantDesc: '',
					image: '',
				},
			],
		},
	],
	enemies: [
		{
			id: 'security-bot',
			name: 'Security Bot',
			slug: 'securityBot',
			variants: [
				{
					variantId: 'security-bot-patrol',
					variantName: 'On Patrol',
					variantDesc: '',
					image: '',
				},
			],
		},
	],
	locations: [
		{
			id: 'neutral-void',
			name: 'Neutral Void',
			slug: 'neutral-void',
			variants: [
				{
					variantId: 'neutral-void-default',
					variantName: 'default',
					variantDesc:
						'A neutral void as a generic background; render the individual form of the character.',
					image: '',
				},
			],
		},
	],
	items: [
		{
			id: 'pig-keychain',
			name: 'PIG Employee Keychain',
			slug: 'pig-employee-keychain',
			variants: [
				{
					variantId: 'pig-keychain-keys',
					variantName: 'Keys',
					variantDesc: 'A neon pink pig keychain.',
					image: '',
				},
			],
		},
	],
};
const TEST_CATALOG = assertCatalog(normalizeCatalog(TEST_DATA));

test('starts with an empty catalog before Supabase data loads', () => {
	assert.deepEqual(getElements('character'), []);
	assert.deepEqual(getElements('item'), []);
});

test('normalizes and validates the catalog', () => {
	const catalog = TEST_CATALOG;

	assert.equal(catalog.characters.length, 1);
	assert.equal(catalog.npcs.length, 1);
	assert.equal(catalog.enemies.length, 1);
	assert.equal(catalog.locations.length, 1);
	assert.equal(catalog.items.length, 1);
	assert.equal(catalog.items[0].elementType, 'item');

	for (const elements of Object.values(catalog)) {
		for (const element of elements) {
			assert.ok(element.id);
			assert.ok(element.slug);
			assert.ok(element.variants.length > 0);
		}
	}
});

test('normalizes optional subcategory metadata', () => {
	const catalog = normalizeCatalog({
		characters: [],
		npcs: [],
		enemies: [],
		locations: [],
		items: [
			{
				id: 'categorized-item',
				name: 'Categorized Item',
				slug: 'categorized-item',
				subcategoryId: 'personal-items',
				subcategoryName: 'Personal Items',
				variants: [],
			},
			{
				id: 'uncategorized-item',
				name: 'Uncategorized Item',
				slug: 'uncategorized-item',
				variants: [],
			},
		],
	});

	assert.equal(catalog.items[0].subcategoryId, 'personal-items');
	assert.equal(catalog.items[0].subcategoryName, 'Personal Items');
	assert.equal(catalog.items[1].subcategoryId, null);
	assert.equal(catalog.items[1].subcategoryName, null);
});

test('looks up a variant by stable ID', () => {
	const enemy = TEST_CATALOG.enemies.find(
		({ slug }) => slug === 'securityBot',
	);
	const expectedVariant = enemy.variants.find(
		({ variantName }) => variantName === 'On Patrol',
	);
	const variant = getVariantById(enemy, expectedVariant.variantId);

	assert.equal(variant.variantName, 'On Patrol');
});

test('looks up the starter item and its variant', () => {
	const item = TEST_CATALOG.items[0];
	const variant = getVariantById(item, item.variants[0].variantId);

	assert.equal(item.name, 'PIG Employee Keychain');
	assert.equal(variant.variantName, 'Keys');
	assert.match(variant.variantDesc, /neon pink pig/);
});

test('returns undefined for an unknown variant ID', () => {
	const character = TEST_CATALOG.characters[0];

	assert.equal(getVariantById(character, 'missing-variant-id'), undefined);
});

test('rejects an unknown catalog element type', () => {
	assert.throws(
		() => getElements('vehicle'),
		/Unknown catalog element type: vehicle/,
	);
});

test('preserves werewolf variant sort order', () => {
	const character = TEST_CATALOG.characters.find(
		({ slug }) => slug === 'river',
	);

	assert.deepEqual(
		character.variants.map(variant => variant.sortOrder),
		[1, 2, 3, 4, 5],
	);
});

test('sorts elements alphabetically by name', () => {
	assert.deepEqual(
		normalizeCatalog({
			characters: [
				{
					id: 'river',
					name: 'River',
					slug: 'river',
					variants: [],
				},
				{
					id: 'lorica',
					name: 'Lorica',
					slug: 'lorica',
					variants: [],
				},
			],
			npcs: [],
			enemies: [],
			locations: [],
			items: [],
		}).characters.map(element => element.name),
		['Lorica', 'River'],
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

test('includes Neutral Void location in the catalog', () => {
	const catalog = TEST_CATALOG;
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

test('public catalog loads only published variants and fails closed after a request error', async () => {
	const originalFetch = globalThis.fetch;
	const elements = [
		{
			id: 'river',
			element_type: 'character',
			name: 'River',
			slug: 'river',
		},
		{ id: 'shade', element_type: 'npc', name: 'Shade', slug: 'shade' },
		{ id: 'grove', element_type: 'location', name: 'Grove', slug: 'grove' },
		{
			id: 'keys',
			element_type: 'item',
			name: 'Keys',
			slug: 'keys',
			subcategory_id: 'personal-items',
			game_element_subcategories: {
				id: 'personal-items',
				name: 'Personal Items',
			},
		},
	];
	const variant = (id, elementId, isPublished, sortOrder = null) => ({
		id,
		element_id: elementId,
		variant_name: id,
		variant_desc: `${id} description`,
		image: '',
		sort_order: sortOrder,
		is_published: isPublished,
	});
	const variants = [
		variant('river-later', 'river', true, 2),
		variant('river-draft', 'river', false, 1),
		variant('river-first', 'river', true, 1),
		variant('shade-draft', 'shade', false),
		variant('grove-default', 'grove', true),
		variant('keys-public', 'keys', true),
		variant('keys-draft', 'keys', false),
	];
	try {
		globalThis.fetch = async url => {
			if (url.includes('/game_element_variants')) {
				assert.equal(
					new URL(url).searchParams.get('is_published'),
					'eq.true',
				);
				return new Response(JSON.stringify(variants));
			}
			return new Response(JSON.stringify(elements));
		};
		await loadCatalog();
		assert.deepEqual(
			getElements('character')[0].variants.map(row => row.variantId),
			['river-first', 'river-later'],
		);
		assert.equal(getElements('npc').length, 0);
		assert.equal(getElements('location').length, 1);
		assert.equal(getElements('enemy').length, 0);
		assert.deepEqual(
			getElements('item')[0].variants.map(row => row.variantId),
			['keys-public'],
		);
		assert.equal(getElements('item')[0].subcategoryId, 'personal-items');
		assert.equal(getElements('item')[0].subcategoryName, 'Personal Items');

		globalThis.fetch = async () => new Response(null, { status: 503 });
		await assert.rejects(loadCatalog(), /Supabase catalog request failed/);
		assert.deepEqual(getElements('character'), []);
		assert.deepEqual(getElements('location'), []);
		assert.deepEqual(getElements('item'), []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('admin catalog requires RPC access and falls back to published variants', async () => {
	const originalFetch = globalThis.fetch;
	const elements = [
		{ id: 'mother', element_type: 'npc', name: 'Mother', slug: 'mother' },
		{ id: 'keys', element_type: 'item', name: 'Keys', slug: 'keys' },
	];
	const variants = [
		{
			id: 'day',
			element_id: 'mother',
			variant_name: 'Day',
			variant_desc: 'By day',
			image: '',
			is_published: true,
		},
		{
			id: 'night',
			element_id: 'mother',
			variant_name: 'Night',
			variant_desc: 'By night',
			image: '',
			is_published: false,
		},
		{
			id: 'keys-draft',
			element_id: 'keys',
			variant_name: 'Draft',
			variant_desc: 'A keychain.',
			image: '',
			is_published: false,
		},
	];
	try {
		globalThis.fetch = async (url, options) => {
			if (url.includes('/rpc/get_admin_catalog')) {
				assert.equal(
					options.headers.Authorization,
					'Bearer admin-token',
				);
				return new Response(JSON.stringify({ elements, variants }));
			}
			assert.match(url, /\/game_elements\?/);
			assert.equal(options.headers.Authorization, 'Bearer admin-token');
			return new Response(JSON.stringify(elements));
		};
		await loadCatalog({ adminAccessToken: 'admin-token' });
		assert.equal(ADMIN_CATALOG_ACTIVE, true);
		assert.deepEqual(
			getElements('npc')[0].variants.map(variant => variant.variantId),
			['day', 'night'],
		);
		assert.equal(
			getElements('item')[0].variants[0].variantId,
			'keys-draft',
		);

		globalThis.fetch = async url => {
			if (url.includes('/rpc/'))
				return new Response(null, { status: 403 });
			if (url.includes('/game_element_variants')) {
				assert.equal(
					new URL(url).searchParams.get('is_published'),
					'eq.true',
				);
				return new Response(JSON.stringify(variants));
			}
			return new Response(JSON.stringify(elements));
		};
		await loadCatalog({ adminAccessToken: 'denied-token' });
		assert.equal(ADMIN_CATALOG_ACTIVE, false);
		assert.deepEqual(
			getElements('npc')[0].variants.map(variant => variant.variantId),
			['day'],
		);
		assert.deepEqual(getElements('item'), []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
