export function normalizeCatalog(data) {
	return {
		characters: normalizeCollection(data.characters, 'character'),
		npcs: normalizeCollection(data.npcs, 'npc'),
		enemies: normalizeCollection(data.enemies, 'enemy'),
		locations: normalizeCollection(data.locations, 'location'),
	};
}

function normalizeCollection(collection, elementType) {
	return collection.map(element => normalizeElement(element, elementType));
}

function normalizeElement(element, elementType) {
	return {
		id: element.id,
		elementType: element.elementType ?? elementType,
		name: element.name,
		slug: element.slug,
		variants: normalizeVariants(element.variants),
	};
}

function normalizeVariants(variants) {
	return variants.map(variant => ({
		variantId: variant.variantId,
		variantName: variant.variantName,
		variantDesc: variant.variantDesc,
		image: variant.image,
	}));
}

export function assertCatalog(catalog) {
	for (const elements of Object.values(catalog)) {
		for (const element of elements) {
			if (!element.id || !element.name || !element.variants.length) {
				throw new Error(
					`Invalid game element: ${element.id ?? 'unknown'}`,
				);
			}
			for (const variant of element.variants) {
				if (
					!variant.variantId ||
					!variant.variantName ||
					typeof variant.variantDesc !== 'string' ||
					typeof variant.image !== 'string'
				) {
					throw new Error(
						`Invalid variant on game element: ${element.id}`,
					);
				}
			}
		}
	}
	return catalog;
}
