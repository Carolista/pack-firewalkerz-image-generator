import DATA from '../data.json' with { type: 'json' };
import { assertCatalog, normalizeCatalog } from '../model/gameElements.js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabaseConfig.js';

let catalog = assertCatalog(normalizeCatalog(DATA));

export let CATALOG = catalog;

export async function loadCatalog() {
	if (!SUPABASE_PUBLISHABLE_KEY) return catalog;

	try {
		const headers = {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
		};
		const [elementsResponse, variantsResponse] = await Promise.all([
			fetch(`${SUPABASE_URL}/rest/v1/game_elements?select=*`, {
				headers,
			}),
			fetch(`${SUPABASE_URL}/rest/v1/game_element_variants?select=*`, {
				headers,
			}),
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
		console.warn('Using local catalog fallback:', error);
		return catalog;
	}
}

function normalizeSupabaseCatalog(elements, variants) {
	const variantsByElement = new Map();
	for (const variant of variants) {
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
	};
	for (const element of elements) {
		const collectionKey = {
			character: 'characters',
			npc: 'npcs',
			enemy: 'enemies',
			location: 'locations',
		}[element.element_type];
		if (!collectionKey) continue;
		normalized[collectionKey].push({
			id: element.id,
			elementType: element.element_type,
			name: element.name,
			slug: element.slug,
			variants: variantsByElement.get(element.id) ?? [],
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
	}[elementType];
	if (!collectionKey) {
		throw new Error(`Unknown catalog element type: ${elementType}`);
	}
	return catalog[collectionKey];
}

export function getVariantById(element, variantId) {
	return element.variants.find(variant => variant.variantId === variantId);
}
