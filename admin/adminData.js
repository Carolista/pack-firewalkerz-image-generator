import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from '../src/services/supabaseConfig.js';

const ELEMENTS_URL = `${SUPABASE_URL}/rest/v1/game_elements`;
const VARIANTS_URL = `${SUPABASE_URL}/rest/v1/game_element_variants`;

export function createAdminDataClient(getSession) {
	function headers() {
		const accessToken = getSession()?.access_token;
		if (!accessToken) throw new Error('Your admin session has expired.');
		return {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		};
	}

	async function request(url, options = {}) {
		const response = await fetch(url, {
			...options,
			headers: { ...headers(), ...options.headers },
		});
		const data = await response.json().catch(() => null);
		if (!response.ok) {
			throw new Error(data?.message ?? 'Supabase request failed.');
		}
		return data;
	}

	return {
		listElements(category) {
			return request(
				`${ELEMENTS_URL}?element_type=eq.${encodeURIComponent(category)}&select=*,game_element_variants(*)&order=name.asc`,
			);
		},
		getElement(id) {
			return request(
				`${ELEMENTS_URL}?id=eq.${encodeURIComponent(id)}&select=*,game_element_variants(*)`,
			);
		},
		createElement(element) {
			return request(ELEMENTS_URL, {
				method: 'POST',
				headers: { Prefer: 'return=representation' },
				body: JSON.stringify(element),
			});
		},
		updateElement(id, changes) {
			return request(`${ELEMENTS_URL}?id=eq.${encodeURIComponent(id)}`, {
				method: 'PATCH',
				headers: { Prefer: 'return=representation' },
				body: JSON.stringify(changes),
			});
		},
		deleteElement(id) {
			return request(`${ELEMENTS_URL}?id=eq.${encodeURIComponent(id)}`, {
				method: 'DELETE',
				headers: { Prefer: 'return=representation' },
			});
		},
		createVariant(variant) {
			return request(VARIANTS_URL, {
				method: 'POST',
				headers: { Prefer: 'return=representation' },
				body: JSON.stringify(variant),
			});
		},
		updateVariant(id, changes) {
			return request(`${VARIANTS_URL}?id=eq.${encodeURIComponent(id)}`, {
				method: 'PATCH',
				headers: { Prefer: 'return=representation' },
				body: JSON.stringify(changes),
			});
		},
		deleteVariant(id) {
			return request(`${VARIANTS_URL}?id=eq.${encodeURIComponent(id)}`, {
				method: 'DELETE',
				headers: { Prefer: 'return=representation' },
			});
		},
	};
}
