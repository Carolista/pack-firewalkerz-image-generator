import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from '../../src/services/supabaseConfig.js';

const BUCKET = 'rpg-generator-reference-images';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
const PUBLIC_URL_BASE = `${STORAGE_URL}/object/public/${BUCKET}`;

// Tracks paths uploaded this session so their <img> URLs bypass stale browser/CDN caching.
const imageVersions = new Map();

// Public Storage URLs never need auth; usable directly by any admin view.
export function getPublicImageUrl(path) {
	if (!path) return '';
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	const version = imageVersions.get(path);
	return version
		? `${PUBLIC_URL_BASE}${path}?v=${version}`
		: `${PUBLIC_URL_BASE}${path}`;
}

export const CATEGORY_FOLDERS = {
	character: 'characters',
	npc: 'npcs',
	enemy: 'enemies',
	location: 'locations',
};

export function createStorageService(getSession, onAuthExpired) {
	function authHeaders() {
		const accessToken = getSession()?.access_token;
		if (!accessToken) throw new Error('Your admin session has expired.');
		return {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${accessToken}`,
		};
	}

	async function request(url, options = {}, canRetryAfterAuth = true) {
		const response = await fetch(url, {
			...options,
			headers: { ...authHeaders(), ...options.headers },
		});
		if (response.status === 401 && canRetryAfterAuth && onAuthExpired) {
			await onAuthExpired();
			return request(url, options, false);
		}
		const data = await response.json().catch(() => null);
		if (!response.ok) {
			throw new Error(
				data?.message ?? 'Supabase Storage request failed.',
			);
		}
		return data;
	}

	return {
		// Overwrites an existing object at the same path (used when a variant regenerates its own image).
		async uploadImage(path, blob) {
			const result = await request(
				`${STORAGE_URL}/object/${BUCKET}/${path}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': blob.type || 'image/jpeg',
						'x-upsert': 'true',
					},
					body: blob,
				},
			);
			imageVersions.set(path, Date.now());
			return result;
		},
		deleteImages(paths) {
			const validPaths = paths.filter(Boolean);
			if (!validPaths.length) return Promise.resolve([]);
			return request(`${STORAGE_URL}/object/${BUCKET}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prefixes: validPaths }),
			});
		},
		deleteImage(path) {
			return this.deleteImages([path]);
		},
		// Returns the filenames (not full paths) present directly under the given folder.
		// Stored paths use a leading slash (e.g. "/npcs/guide-bot.jpg"), so the prefix must match that.
		async listFolder(folder) {
			const entries = await request(
				`${STORAGE_URL}/object/list/${BUCKET}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prefix: `/${folder}/` }),
				},
			);
			return (entries ?? []).map(entry => entry.name);
		},
	};
}
