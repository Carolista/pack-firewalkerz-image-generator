import { CUSTOM_LOCATION_REFERENCE_KEY } from './constants.js';

// Prompts are ordered parts: { type: 'text', text } | { type: 'image', image, label }.
// An image's label is sent only when the image itself loads.

export const NEUTRAL_VOID_SLUG = 'neutral-void';

export const STYLE_INSTRUCTION = "Digital oil and gouache painting style, cinematic storybook realism illustration. Rich tactile brushstrokes, soft painterly edge blending, lineless form definition, volumetric atmospheric lighting, matte painterly finish. Highly detailed environmental texture without hyperrealistic photos or flat cartoon lines. Avoid 3D CGI render, avoid flat cel shading, avoid black ink outlines, avoid vector line art, avoid sharp digital edge sharpening, avoid photorealism, avoid comic book ink lines.";

export const NO_BORDER_INSTRUCTION =
	'Fill the entire square canvas edge-to-edge with no white borders, blank margins, framing, or letterboxing. The artwork is unsigned: no signatures, initials, watermarks, logos, or captions anywhere in the image, including the corners.';

const ROLE_LABELS = {
	character: 'Character',
	npc: 'NPC',
	enemy: 'Enemy',
	item: 'Item',
};

function textPart(text) {
	return { type: 'text', text };
}

function labelWithVariant({ elementName, variantName }) {
	return variantName ? `${elementName} (${variantName})` : elementName;
}

function pluralize(count, singular, plural) {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function isNeutralVoidLocation(location) {
	return location?.slug === NEUTRAL_VOID_SLUG;
}

export function isCustomLocationReference(location) {
	return location?.elementId === CUSTOM_LOCATION_REFERENCE_KEY;
}

export function buildSceneOnlyPrompt(scene) {
	return [
		textPart(`Painterly digital illustration.
Use only the following scene description to determine the subjects, setting, and action.
${NO_BORDER_INSTRUCTION}
Scene: ${scene}`),
	];
}

export function buildLocationPrompt(description) {
	return [
		textPart(`Atmospheric, painterly digital illustration.
Use the location description as the sole direction for the subject matter and faithfully render all details it describes, whether natural, architectural, cultural, or civilized.
Do not add unrelated subjects, creatures, themes, or visual motifs that are not present in the location description.
${NO_BORDER_INSTRUCTION}
Location: ${description}`),
	];
}

// Renders one character, NPC, enemy, or item alone, optionally over a fixed background image.
export function buildSingleSubjectPrompt({
	category,
	name,
	description,
	backgroundImage,
}) {
	const isItem = category === 'item';
	const subjectLine = isItem
		? 'Render exactly one item as the sole subject, fully visible in the frame:'
		: 'Render exactly one individual character, NPC, or enemy in the foreground, from head to toe without being cut off in the frame:';
	const subject = name ? `${name}: ${description}` : description;
	const exclusions = isItem
		? 'Do not add any other objects, characters, or scenery.'
		: 'Do not add any other subjects, props, or scenery.';

	const parts = [
		textPart(`${STYLE_INSTRUCTION}
${subjectLine}
${subject}
${exclusions}
${NO_BORDER_INSTRUCTION}`),
	];

	if (backgroundImage) {
		parts.push({
			type: 'image',
			image: backgroundImage,
			label: 'Background reference image: place the subject in front of this exact background. Do not modify, extend, or replace the background.',
		});
	} else {
		parts.push(
			textPart(
				'Use a plain, neutral, unobtrusive background so the subject is the sole focus.',
			),
		);
	}

	return parts;
}

// Establishes the action and setting first, then numbers each subject with its reference image directly after its description.
export function buildScenePrompt({ subjects, location, scene }) {
	const figureCount = subjects.filter(s => s.elementType !== 'item').length;
	const itemCount = subjects.length - figureCount;
	const countPhrase = [
		figureCount && pluralize(figureCount, 'figure', 'figures'),
		itemCount && pluralize(itemCount, 'item', 'items'),
	]
		.filter(Boolean)
		.join(' and ');

	const locationLabel = labelWithVariant(location);
	const parts = [
		textPart(`${STYLE_INSTRUCTION}
Action/Scene: ${scene}
Setting: ${locationLabel}: ${location.variantDesc}`),
	];
	if (location.image) {
		parts.push({
			type: 'image',
			image: location.image,
			label: `Reference image for the Setting (${locationLabel}): this is the location of the scene. Adapt its terrain, layout, and framing as needed so the Action/Scene is physically plausible. Do not include any figures that appear in it.`,
		});
	}

	parts.push(
		textPart(
			`The scene includes exactly ${countPhrase}, listed below as numbered subjects. Render every subject exactly once, each as a separate and clearly distinct figure or object. Keep each subject's features, coloring, clothing, and equipment exclusive to that subject: never merge subjects, blend or swap features between them, or omit any of them.`,
		),
	);

	const firstSubjectByVariant = new Map();
	subjects.forEach((subject, index) => {
		const number = index + 1;
		const role = ROLE_LABELS[subject.elementType] ?? 'Subject';
		const heading = `Subject ${number} — ${role}: ${labelWithVariant(subject)}.`;
		const variantKey = `${subject.elementId}:${subject.variantId}`;
		const originalNumber = firstSubjectByVariant.get(variantKey);

		if (originalNumber) {
			parts.push(
				textPart(
					`${heading} Identical in appearance to Subject ${originalNumber}, rendered as a separate ${subject.elementType === 'item' ? 'item' : 'individual'}.`,
				),
			);
			return;
		}

		firstSubjectByVariant.set(variantKey, number);
		parts.push(textPart(`${heading} ${subject.variantDesc}`));
		if (subject.image) {
			parts.push({
				type: 'image',
				image: subject.image,
				label: `Reference image for Subject ${number} (${subject.elementName}): use for this subject's appearance only.`,
			});
		}
	});

	const roster = subjects
		.map(
			(subject, index) => `Subject ${index + 1} (${subject.elementName})`,
		)
		.join(', ');

	parts.push(
		textPart(`Pose, express, and position every subject strictly according to the Action/Scene description, within the setting. Use the subject reference images only for each subject's appearance (face, coloring, features, physique, clothing, and equipment); do not copy their poses, facial expressions, gaze directions, framing, backgrounds, lighting, or camera angles.
Keep every subject in natural proportion to the setting and to each other, in consistent perspective.
${NO_BORDER_INSTRUCTION}
Final check: the image must include all ${countPhrase}: ${roster}.`),
	);

	return parts;
}

// Readable prompt text for console debugging; images appear as placeholders instead of data.
export function formatPromptForDebug(parts) {
	return parts
		.map(part =>
			part.type === 'image' ? `[Image: ${part.label}]` : part.text,
		)
		.join('\n');
}
