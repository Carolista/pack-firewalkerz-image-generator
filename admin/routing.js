const ROUTE_CATEGORIES = new Set([
	'character',
	'npc',
	'enemy',
	'location',
	'item',
]);

export function getRoute(hash = window.location.hash) {
	const [path, query = ''] = hash.split('?');
	const parts = path.split('/');
	if (parts[1] === 'view' && ROUTE_CATEGORIES.has(parts[2])) {
		return {
			name: 'view',
			category: parts[2],
			subcategory: new URLSearchParams(query).get('sub') ?? '',
		};
	}
	if (parts[1] === 'details' && ROUTE_CATEGORIES.has(parts[2]) && parts[3]) {
		return {
			name: 'details',
			category: parts[2],
			slug: decodeURIComponent(parts[3]),
		};
	}
	if (parts[1] === 'add' && ROUTE_CATEGORIES.has(parts[2])) {
		return { name: 'add', category: parts[2] };
	}
	if (parts[1] === 'edit' && ROUTE_CATEGORIES.has(parts[2]) && parts[3]) {
		return {
			name: 'edit',
			category: parts[2],
			slug: decodeURIComponent(parts[3]),
		};
	}
	return null;
}

export function navigateTo(route) {
	const suffix =
		route.name === 'view'
			? `view/${route.category}${route.subcategory ? `?sub=${encodeURIComponent(route.subcategory)}` : ''}`
			: `${route.name}/${route.category}${route.slug ? `/${encodeURIComponent(route.slug)}` : ''}`;
	window.location.hash = `#/${suffix}`;
}
