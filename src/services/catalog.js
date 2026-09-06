import DATA from '../data.json' with { type: 'json' };
import { assertCatalog, normalizeCatalog } from '../model/gameElements.js';

export const CATALOG = assertCatalog(normalizeCatalog(DATA));

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
	return CATALOG[collectionKey];
}

export function getVariantById(element, variantId) {
	return element.variants.find(variant => variant.variantId === variantId);
}
