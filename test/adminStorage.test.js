import assert from 'node:assert/strict';
import test from 'node:test';

import { createStorageService } from '../admin/services/storageService.js';

test('image removal uses exact Storage object names without leading slashes', async () => {
	const originalFetch = globalThis.fetch;
	const requests = [];
	try {
		globalThis.fetch = async (url, options) => {
			requests.push({ url, options });
			return new Response(
				JSON.stringify([
					{ name: 'npcs/guide.jpg' },
					{ name: 'locations/den.png' },
				]),
			);
		};
		const storage = createStorageService(() => ({
			access_token: 'test-token',
		}));
		await storage.deleteImages([
			'/npcs/guide.jpg',
			'npcs/guide.jpg',
			'/locations/den.png',
			'https://example.com/external.png',
		]);
		assert.equal(requests.length, 1);
		assert.equal(requests[0].options.method, 'DELETE');
		assert.deepEqual(JSON.parse(requests[0].options.body), {
			prefixes: ['npcs/guide.jpg', 'locations/den.png'],
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('image removal rejects a successful response that omitted the requested file', async () => {
	const originalFetch = globalThis.fetch;
	try {
		globalThis.fetch = async url =>
			new Response(
				JSON.stringify(
					url.includes('/object/info/')
						? { name: 'npcs/missing.jpg' }
						: [],
				),
			);
		const storage = createStorageService(() => ({
			access_token: 'test-token',
		}));
		await assert.rejects(
			storage.deleteImage('/npcs/missing.jpg'),
			/Image npcs\/missing.jpg was not removed from Storage/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('image removal allows a retry when the file is already absent', async () => {
	const originalFetch = globalThis.fetch;
	try {
		globalThis.fetch = async url =>
			url.includes('/object/info/')
				? new Response(null, { status: 404 })
				: new Response(JSON.stringify([]));
		const storage = createStorageService(() => ({
			access_token: 'test-token',
		}));
		assert.deepEqual(await storage.deleteImage('/npcs/gone.jpg'), []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('image removal propagates a Storage permission failure', async () => {
	const originalFetch = globalThis.fetch;
	try {
		globalThis.fetch = async () =>
			new Response(JSON.stringify({ message: 'Not allowed' }), {
				status: 403,
			});
		const storage = createStorageService(() => ({
			access_token: 'test-token',
		}));
		await assert.rejects(
			storage.deleteImage('/npcs/guide.jpg'),
			/Not allowed/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('image removal does not send a request for empty paths', async () => {
	const originalFetch = globalThis.fetch;
	try {
		globalThis.fetch = () => {
			throw new Error('Unexpected request');
		};
		const storage = createStorageService(() => ({
			access_token: 'test-token',
		}));
		assert.deepEqual(await storage.deleteImages(['', null]), []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
