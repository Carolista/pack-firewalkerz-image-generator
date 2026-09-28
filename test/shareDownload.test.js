import assert from 'node:assert/strict';
import test from 'node:test';

import {
	extensionForMimeType,
	filenameForBlob,
} from '../src/services/download.js';
import {
	canShareFile,
	createShareFile,
	fetchShareBlob,
} from '../src/services/share.js';

test('image filenames follow the blob MIME type', () => {
	for (const [mimeType, extension] of [
		['image/jpeg', 'jpg'],
		['image/png', 'png'],
		['image/webp', 'webp'],
	]) {
		assert.equal(extensionForMimeType(mimeType), extension);
		assert.equal(
			filenameForBlob(new Blob(['image'], { type: mimeType }), 'scene'),
			`scene.${extension}`,
		);
	}
	assert.equal(extensionForMimeType('image/unknown'), 'jpg');
	assert.equal(filenameForBlob(new Blob(['image']), 'scene'), 'scene.jpg');
});

test('a shared File keeps the source MIME and matching extension', () => {
	const file = createShareFile(
		new Blob(['image'], { type: 'image/png' }),
		'scene',
	);
	assert.equal(file.name, 'scene.png');
	assert.equal(file.type, 'image/png');
});

test('file sharing detects available, missing, and throwing browser APIs', () => {
	const previousNavigator = Object.getOwnPropertyDescriptor(
		globalThis,
		'navigator',
	);
	const file = createShareFile(new Blob(['image']), 'scene');
	try {
		Object.defineProperty(globalThis, 'navigator', {
			configurable: true,
			value: { canShare: () => true },
		});
		assert.equal(canShareFile(file), true);
		globalThis.navigator.canShare = () => false;
		assert.equal(canShareFile(file), false);
		globalThis.navigator.canShare = () => {
			throw new TypeError('unsupported');
		};
		assert.equal(canShareFile(file), false);
		globalThis.navigator.canShare = undefined;
		assert.equal(canShareFile(file), false);
	} finally {
		if (previousNavigator) {
			Object.defineProperty(globalThis, 'navigator', previousNavigator);
		} else {
			Reflect.deleteProperty(globalThis, 'navigator');
		}
	}
});

test('fetchShareBlob returns the image and rejects failed responses', async () => {
	const originalFetch = globalThis.fetch;
	const image = new Blob(['image'], { type: 'image/png' });
	try {
		globalThis.fetch = async () => new Response(image);
		const result = await fetchShareBlob('https://example.com/image.png');
		assert.equal(result.type, 'image/png');
		assert.equal(await result.text(), 'image');
		globalThis.fetch = async () => new Response(null, { status: 404 });
		await assert.rejects(
			fetchShareBlob('https://example.com/missing.png'),
			/Could not load the image to share/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
