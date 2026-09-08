import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from '../src/services/supabaseConfig.js';

const ELEMENTS_URL = `${SUPABASE_URL}/rest/v1/game_elements`;
const VARIANTS_URL = `${SUPABASE_URL}/rest/v1/game_element_variants`;

export function createAdminDataClient(getSession, onAuthExpired) {
	function headers() {
		const accessToken = getSession()?.access_token;
		if (!accessToken) throw new Error('Your admin session has expired.');
		return {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		};
	}

	async function request(url, options = {}, canRetryAfterAuth = true) {
		const response = await fetch(url, {
			...options,
			headers: { ...headers(), ...options.headers },
		});
		const data = await response.json().catch(() => null);
		if (response.status === 401 && canRetryAfterAuth && onAuthExpired) {
			await onAuthExpired();
			return request(url, options, false);
		}
		if (!response.ok) {
			throw new Error(data?.message ?? 'Supabase request failed.');
		}
		return data;
	}

	async function deleteRow(url, label) {
		const deleted = await request(url, {
			method: 'DELETE',
			headers: { Prefer: 'return=representation' },
		});
		if (!Array.isArray(deleted) || deleted.length === 0) {
			throw new Error(
				`No ${label} was deleted. Check authenticated DELETE permissions and RLS policies.`,
			);
		}
		return deleted;
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
		getElementBySlug(slug) {
			return request(
				`${ELEMENTS_URL}?slug=eq.${encodeURIComponent(slug)}&select=*,game_element_variants(*)`,
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
			return deleteRow(
				`${ELEMENTS_URL}?id=eq.${encodeURIComponent(id)}`,
				'element',
			);
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
			return deleteRow(
				`${VARIANTS_URL}?id=eq.${encodeURIComponent(id)}`,
				'variant',
			);
		},
	};
}
