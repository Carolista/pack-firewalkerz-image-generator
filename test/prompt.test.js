import assert from 'node:assert/strict';
import test from 'node:test';

import {
	NO_BORDER_INSTRUCTION,
	STYLE_INSTRUCTION,
	buildLocationPrompt,
	buildSceneOnlyPrompt,
	buildScenePrompt,
	buildSingleSubjectPrompt,
	formatPromptForDebug,
	isCustomLocationReference,
	isNeutralVoidLocation,
} from '../src/prompt.js';
import { assembleRequestParts } from '../src/services/api.js';

function promptText(parts) {
	return parts
		.filter(part => part.type === 'text')
		.map(part => part.text)
		.join('\n');
}

function imageParts(parts) {
	return parts.filter(part => part.type === 'image');
}

function subject(overrides) {
	return {
		elementId: 'river',
		elementType: 'character',
		elementName: 'River',
		variantId: 'river-crinos',
		variantName: 'Crinos',
		variantDesc: 'A towering silver werewolf.',
		image: 'characters/river.png',
		...overrides,
	};
}

const woods = {
	elementId: 'woods',
	elementType: 'location',
	elementName: 'Appalachian Woods',
	variantId: 'woods-night',
	variantName: 'Nighttime',
	variantDesc: 'A dark forest under the moon.',
	image: 'locations/woods.png',
	slug: 'appalachian-woods',
};

test('detects the Neutral Void and custom location reference modes', () => {
	assert.ok(isNeutralVoidLocation({ slug: 'neutral-void' }));
	assert.ok(!isNeutralVoidLocation(woods));
	assert.ok(!isNeutralVoidLocation(null));
	assert.ok(
		isCustomLocationReference({ elementId: 'custom-location-reference' }),
	);
	assert.ok(!isCustomLocationReference(woods));
	assert.ok(!isCustomLocationReference(null));
});

test('scene-only prompt contains no campaign or reference-image context', () => {
	const parts = buildSceneOnlyPrompt('A traveler crosses a frozen lake.');
	const text = promptText(parts);

	assert.equal(imageParts(parts).length, 0);
	assert.match(text, /Scene: A traveler crosses a frozen lake/);
	assert.ok(text.includes(NO_BORDER_INSTRUCTION));
	assert.doesNotMatch(text, /Werewolf|World of Darkness|reference|Setting:/);
});

test('location prompt describes only the location', () => {
	const parts = buildLocationPrompt('A flooded stone chapel.');
	const text = promptText(parts);

	assert.equal(imageParts(parts).length, 0);
	assert.match(
		text,
		/Digital oil and gouache painting style, cinematic storybook realism illustration/,
	);
	assert.match(text, /Do not add unrelated subjects, creatures, themes/);
	assert.match(text, /Location: A flooded stone chapel\./);
	assert.ok(text.includes(NO_BORDER_INSTRUCTION));
	assert.ok(!text.includes('World of Darkness'));
});

test('single-subject prompt places a figure over the background image', () => {
	const parts = buildSingleSubjectPrompt({
		category: 'character',
		name: 'River',
		description: 'A towering silver werewolf.',
		backgroundImage: 'locations/neutral-void.png',
	});
	const text = promptText(parts);

	assert.ok(text.startsWith(STYLE_INSTRUCTION));
	assert.match(text, /exactly one individual character, NPC, or enemy/);
	assert.match(text, /head to toe/);
	assert.match(text, /River: A towering silver werewolf\./);
	assert.ok(text.includes(NO_BORDER_INSTRUCTION));
	assert.doesNotMatch(text, /plain, neutral, unobtrusive background/);
	assert.deepEqual(parts.at(-1), {
		type: 'image',
		image: 'locations/neutral-void.png',
		label: 'Background reference image: place the subject in front of this exact background. Do not modify, extend, or replace the background.',
	});
});

test('single-subject item prompt uses a plain background without figure instructions', () => {
	const parts = buildSingleSubjectPrompt({
		category: 'item',
		name: 'Keychain: Keys',
		description: 'A dozen keys on a pink pig keychain.',
	});
	const text = promptText(parts);

	assert.equal(imageParts(parts).length, 0);
	assert.match(text, /Render exactly one item/);
	assert.match(text, /Keychain: Keys: A dozen keys/);
	assert.match(text, /plain, neutral, unobtrusive background/);
	assert.doesNotMatch(text, /head to toe|individual character/i);
});

test('single-subject prompt without a name uses the description alone', () => {
	const text = promptText(
		buildSingleSubjectPrompt({ description: 'A warrior in plate armor.' }),
	);

	assert.match(text, /in the frame:\nA warrior in plate armor\./);
});

test('scene prompt establishes the action and setting before the numbered subjects', () => {
	const parts = buildScenePrompt({
		subjects: [
			subject(),
			subject({
				elementId: 'hoss',
				elementName: 'Hoss',
				variantId: 'hoss-homid',
				variantName: 'Homid',
				variantDesc: 'A burly bearded man.',
				image: 'characters/hoss.png',
			}),
		],
		location: woods,
		scene: 'The pack crosses the river.',
	});

	assert.match(
		parts[0].text,
		/^.+\nAction\/Scene: The pack crosses the river\.\nSetting: Appalachian Woods \(Nighttime\): A dark forest/,
	);
	assert.equal(parts[1].image, 'locations/woods.png');
	assert.match(parts[1].label, /location of the scene/);
	assert.match(parts[1].label, /Adapt its terrain, layout, and framing/);

	const castIndex = parts.findIndex(part =>
		part.text?.startsWith('The scene includes exactly 2 figures'),
	);
	const riverIndex = parts.findIndex(part =>
		part.text?.startsWith('Subject 1 — Character: River (Crinos).'),
	);
	const hossIndex = parts.findIndex(part =>
		part.text?.startsWith('Subject 2 — Character: Hoss (Homid).'),
	);

	assert.equal(castIndex, 2);
	assert.ok(riverIndex > castIndex);
	assert.equal(parts[riverIndex + 1].image, 'characters/river.png');
	assert.match(parts[riverIndex + 1].label, /Subject 1 \(River\)/);
	assert.equal(parts[hossIndex + 1].image, 'characters/hoss.png');
	assert.match(parts[hossIndex + 1].label, /Subject 2 \(Hoss\)/);
	assert.match(parts.at(-1).text, /^Pose, express, and position/);
});

test('scene prompt states exact figure and item counts', () => {
	const mixed = promptText(
		buildScenePrompt({
			subjects: [
				subject(),
				subject({ elementId: 'hoss', elementName: 'Hoss' }),
				subject({
					elementId: 'keys',
					elementType: 'item',
					elementName: 'Keys',
				}),
			],
			location: woods,
			scene: 'A standoff.',
		}),
	);
	const single = promptText(
		buildScenePrompt({
			subjects: [subject()],
			location: woods,
			scene: 'A run.',
		}),
	);
	const itemsOnly = promptText(
		buildScenePrompt({
			subjects: [
				subject({
					elementId: 'a',
					elementType: 'item',
					elementName: 'A',
				}),
				subject({
					elementId: 'b',
					elementType: 'item',
					elementName: 'B',
				}),
			],
			location: woods,
			scene: 'Items on a table.',
		}),
	);

	assert.match(mixed, /exactly 2 figures and 1 item,/);
	assert.match(mixed, /Subject 3 — Item: Keys/);
	assert.match(single, /exactly 1 figure,/);
	assert.match(itemsOnly, /exactly 2 items,/);
	assert.doesNotMatch(itemsOnly, /0 figures/);
});

test('duplicate subjects get their own number but share one reference image', () => {
	const bane = subject({
		elementId: 'bane',
		elementType: 'enemy',
		elementName: 'Bane',
		variantId: 'bane-default',
		variantName: '',
		variantDesc: 'A toxic spirit.',
		image: 'enemies/bane.png',
	});
	const parts = buildScenePrompt({
		subjects: [subject(), bane, bane],
		location: woods,
		scene: 'Two Banes circle River.',
	});
	const text = promptText(parts);

	assert.match(text, /Subject 2 — Enemy: Bane\. A toxic spirit\./);
	assert.match(
		text,
		/Subject 3 — Enemy: Bane\. Identical in appearance to Subject 2, rendered as a separate individual\./,
	);
	assert.equal(
		imageParts(parts).filter(part => part.image === 'enemies/bane.png')
			.length,
		1,
	);
	assert.match(text, /exactly 3 figures,/);
});

test('scene prompt omits the variant label and image for a custom location', () => {
	const parts = buildScenePrompt({
		subjects: [subject({ image: '' })],
		location: {
			elementId: 'other',
			elementType: 'location',
			elementName: 'Custom Location',
			variantName: '',
			variantDesc: 'A misty harbor.',
			image: '',
		},
		scene: 'A ship arrives.',
	});

	assert.equal(imageParts(parts).length, 0);
	assert.match(promptText(parts), /Setting: Custom Location: A misty harbor/);
});

test('scene prompt ends with appearance-only rules and a full roster', () => {
	const text = promptText(
		buildScenePrompt({
			subjects: [
				subject(),
				subject({ elementId: 'hoss', elementName: 'Hoss' }),
			],
			location: woods,
			scene: 'The pack howls.',
		}),
	);

	assert.ok(text.startsWith(STYLE_INSTRUCTION));
	assert.match(text, /never merge subjects, blend or swap features/);
	assert.match(
		text,
		/Use the subject reference images only for each subject's appearance/,
	);
	assert.match(text, /do not copy their poses.*framing, backgrounds/);
	assert.match(text, /natural proportion/);
	assert.ok(text.includes(NO_BORDER_INSTRUCTION));
	assert.match(
		text,
		/Final check: the image must include all 2 figures: Subject 1 \(River\), Subject 2 \(Hoss\)\.$/,
	);
});

test('debug formatting shows text and image placeholders in order', () => {
	const debugText = formatPromptForDebug([
		{ type: 'text', text: 'Subject 1' },
		{ type: 'image', image: 'river.png', label: 'River reference' },
		{ type: 'text', text: 'Closing' },
	]);

	assert.equal(debugText, 'Subject 1\n[Image: River reference]\nClosing');
});

test('request parts drop an image that failed to load along with its label', () => {
	const inlineData = { mimeType: 'image/jpeg', data: 'abc' };
	const requestParts = assembleRequestParts(
		[
			{ type: 'text', text: 'Subject 1' },
			{ type: 'image', image: 'river.png', label: 'River reference' },
			{ type: 'text', text: 'Subject 2' },
			{ type: 'image', image: 'missing.png', label: 'Missing reference' },
		],
		new Map([
			['river.png', inlineData],
			['missing.png', null],
		]),
	);

	assert.deepEqual(requestParts, [
		{ text: 'Subject 1' },
		{ text: 'River reference' },
		{ inlineData },
		{ text: 'Subject 2' },
	]);
});
