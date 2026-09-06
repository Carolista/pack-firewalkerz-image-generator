import fs from 'node:fs/promises';

const SUPABASE_URL = 'https://sppinbsvnskimkoncudb.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
	throw new Error(
		'SUPABASE_SERVICE_ROLE_KEY must be set in the terminal environment.',
	);
}

const data = JSON.parse(
	await fs.readFile(new URL('../src/data.json', import.meta.url), 'utf8'),
);
const elements = Object.values(data).flat();
const elementRows = elements.map(({ id, elementType, name, slug }) => ({
	id,
	element_type: elementType,
	name,
	slug,
}));
const variantRows = elements.flatMap(element =>
	element.variants.map(variant => ({
		id: variant.variantId,
		element_id: element.id,
		variant_name: variant.variantName,
		variant_desc: variant.variantDesc,
		image: variant.image,
	})),
);

async function upsert(table, rows) {
	const response = await fetch(
		`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`,
		{
			method: 'POST',
			headers: {
				apikey: serviceRoleKey,
				Authorization: `Bearer ${serviceRoleKey}`,
				'Content-Type': 'application/json',
				Prefer: 'resolution=merge-duplicates,return=minimal',
			},
			body: JSON.stringify(rows),
		},
	);
	if (!response.ok) {
		throw new Error(
			`${table} seed failed: ${response.status} ${await response.text()}`,
		);
	}
}

await upsert('game_elements', elementRows);
await upsert('game_element_variants', variantRows);
console.log(
	`Seeded ${elementRows.length} elements and ${variantRows.length} variants.`,
);
