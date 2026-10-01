export const NO_SUBCATEGORY_FILTER = 'none';

export function matchesCatalogFilter(element, filterValue) {
	if (!filterValue) return true;
	if (filterValue === NO_SUBCATEGORY_FILTER) return !element.subcategory_id;
	return element.subcategory_id === filterValue;
}

// Subcategories with zero elements stay listed so admins can see they are empty.
export function getCatalogFilterOptions(
	subcategories,
	elements,
	allLabel = 'All',
) {
	if (!subcategories.length) return [];
	const counts = new Map();
	let uncategorized = 0;
	for (const element of elements) {
		if (!element.subcategory_id) uncategorized += 1;
		else
			counts.set(
				element.subcategory_id,
				(counts.get(element.subcategory_id) ?? 0) + 1,
			);
	}
	return [
		{ value: '', label: `${allLabel} (${elements.length})` },
		...subcategories.map(subcategory => ({
			value: subcategory.id,
			label: `${subcategory.name} (${counts.get(subcategory.id) ?? 0})`,
		})),
		{
			value: NO_SUBCATEGORY_FILTER,
			label: `No subcategory (${uncategorized})`,
		},
	];
}

export function isKnownFilterValue(filterValue, subcategories) {
	return (
		!filterValue ||
		filterValue === NO_SUBCATEGORY_FILTER ||
		subcategories.some(subcategory => subcategory.id === filterValue)
	);
}
