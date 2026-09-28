import DATA from '../data.json' with { type: 'json' };
import { assertCatalog, normalizeCatalog } from '../model/gameElements.js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabaseConfig.js';

let catalog = assertCatalog(normalizeCatalog(DATA));

export let CATALOG = catalog;
export let ADMIN_CATALOG_ACTIVE = false;

export async function loadCatalog({ adminAccessToken } = {}) {
	if (!SUPABASE_PUBLISHABLE_KEY) return catalog;

	ADMIN_CATALOG_ACTIVE = false;
	if (adminAccessToken) {
		try {
			const response = await fetch(
				`${SUPABASE_URL}/rest/v1/rpc/get_admin_catalog`,
				{
					headers: {
						apikey: SUPABASE_PUBLISHABLE_KEY,
						Authorization: `Bearer ${adminAccessToken}`,
					},
				},
			);
			if (!response.ok) throw new Error('Admin catalog access denied.');
			const result = await response.json();
			if (
				!Array.isArray(result?.elements) ||
				!Array.isArray(result?.variants)
			) {
				throw new Error('Invalid admin catalog response.');
			}
			catalog = assertCatalog(
				normalizeSupabaseCatalog(
					result.elements,
					result.variants,
					true,
				),
			);
			CATALOG = catalog;
			ADMIN_CATALOG_ACTIVE = true;
			return catalog;
		} catch (error) {
			console.warn(
				'Admin catalog unavailable; loading published catalog:',
				error,
			);
		}
	}

	try {
		const headers = {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
		};
		const [elementsResponse, variantsResponse] = await Promise.all([
			fetch(`${SUPABASE_URL}/rest/v1/game_elements?select=*`, {
				headers,
			}),
			fetch(
				`${SUPABASE_URL}/rest/v1/game_element_variants?select=*&is_published=eq.true`,
				{ headers },
			),
		]);
		if (!elementsResponse.ok || !variantsResponse.ok) {
			throw new Error('Supabase catalog request failed.');
		}

		const [elements, variants] = await Promise.all([
			elementsResponse.json(),
			variantsResponse.json(),
		]);
		catalog = assertCatalog(normalizeSupabaseCatalog(elements, variants));
		CATALOG = catalog;
		return catalog;
	} catch (error) {
		catalog = {
			characters: [],
			npcs: [],
			enemies: [],
			locations: [],
			items: [],
		};
		CATALOG = catalog;
		ADMIN_CATALOG_ACTIVE = false;
		console.warn('Campaign catalog unavailable:', error);
		throw error;
	}
}

function normalizeSupabaseCatalog(
	elements,
	variants,
	includeUnpublished = false,
) {
	const variantsByElement = new Map();
	for (const variant of variants) {
		if (!includeUnpublished && variant.is_published !== true) continue;
		const elementVariants = variantsByElement.get(variant.element_id) ?? [];
		elementVariants.push({
			variantId: variant.id,
			variantName: variant.variant_name,
			variantDesc: variant.variant_desc,
			image: variant.image ?? '',
			sortOrder: variant.sort_order ?? null,
		});
		variantsByElement.set(variant.element_id, elementVariants);
	}

	const normalized = {
		characters: [],
		npcs: [],
		enemies: [],
		locations: [],
		items: [],
	};
	for (const element of elements) {
		const collectionKey = {
			character: 'characters',
			npc: 'npcs',
			enemy: 'enemies',
			location: 'locations',
			item: 'items',
		}[element.element_type];
		if (!collectionKey) continue;
		const publishedVariants = variantsByElement.get(element.id);
		if (!publishedVariants?.length) continue;
		normalized[collectionKey].push({
			id: element.id,
			elementType: element.element_type,
			name: element.name,
			slug: element.slug,
			variants: publishedVariants,
		});
	}
	return normalizeCatalog(normalized);
}

export function getElements(elementType) {
	const collectionKey = {
		character: 'characters',
		npc: 'npcs',
		enemy: 'enemies',
		location: 'locations',
		item: 'items',
	}[elementType];
	if (!collectionKey) {
		throw new Error(`Unknown catalog element type: ${elementType}`);
	}
	return catalog[collectionKey];
}

export function getVariantById(element, variantId) {
	return element.variants.find(variant => variant.variantId === variantId);
}
