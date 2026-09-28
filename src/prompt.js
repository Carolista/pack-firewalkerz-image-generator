import { CUSTOM_LOCATION_REFERENCE_KEY } from './constants.js';

export const NEUTRAL_VOID_SLUG = 'neutral-void';

export const NO_BORDER_INSTRUCTION =
	'Fill the entire square canvas edge-to-edge with no white borders, blank margins, framing, or letterboxing.';

export function buildSceneOnlyPrompt(scene) {
	return `Detailed, painterly digital illustration.
Use only the following scene description to determine the subjects, setting, and action.
${NO_BORDER_INSTRUCTION}
Scene: ${scene}`;
}

export function isReferenceModeLocation(location) {
	return location?.slug === NEUTRAL_VOID_SLUG;
}

export function isLocationReferenceMode(location) {
	return location?.elementId === CUSTOM_LOCATION_REFERENCE_KEY;
}

// Standalone reference-image prompt for admin variant creation, independent of the row-based generator flow.
export function buildReferenceImagePrompt({ category, name, description }) {
	if (category === 'location') {
		return `Detailed, atmospheric, painterly digital illustration.
Use the location description as the sole direction for the subject matter and faithfully render all details it describes, whether natural, architectural, cultural, or civilized.
Do not add unrelated subjects, creatures, themes, or visual motifs that are not present in the location description.
${NO_BORDER_INSTRUCTION}
Location: ${description}`;
	}

	if (category === 'item') {
		return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style.
Render exactly one item as the sole subject, fully visible in the frame:
${name}: ${description}
If a Neutral Void reference image is provided below, keep that exact background unchanged and do not modify or replace it. Otherwise, use a plain, neutral, unobtrusive background. Do not add any other objects, characters, or scenery.
${NO_BORDER_INSTRUCTION}`;
	}

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style.
Render exactly one individual character, NPC, or enemy in the foreground as follows:
${name}: ${description}
If a Neutral Void reference image is provided below, keep that exact background unchanged and do not modify or replace it. Otherwise, set the subject against a plain, neutral, unobtrusive background so the subject is the sole focus. Do not add any other subjects, props, or scenery. Ensure the subject is rendered from head to toe without being cut off in the frame. 
${NO_BORDER_INSTRUCTION}`;
}

export function buildPrompt({
	characters,
	npcs,
	enemies,
	items = [],
	location,
	locationDesc,
	scene,
}) {
	// Location reference mode: location description only
	if (isLocationReferenceMode(location)) {
		return `Detailed, atmospheric, painterly digital illustration.
Use the location description as the sole direction for the subject matter and faithfully render all details it describes, whether natural, architectural, cultural, or civilized.
Do not add unrelated subjects, creatures, themes, or visual motifs that are not present in the location description.
${NO_BORDER_INSTRUCTION}
Location: ${locationDesc ?? location?.variantDesc ?? ''}`;
	}

	// Neutral Void reference mode: no entity blocks, subject description from scene
	if (
		isReferenceModeLocation(location) &&
		!characters.length &&
		!npcs.length &&
		!enemies.length &&
		!items.length
	) {
		return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style.
Render exactly one individual character, NPC, or enemy in the foreground as follows:
${scene}
Keep the Neutral Void background unchanged. Do not modify or replace the background.
If a reference photo is provided below, use it only for the subject's appearance and likeness. Do not copy the reference photo's pose, expression, camera angle, or background.
${NO_BORDER_INSTRUCTION}`;
	}

	// Normal mode: entity blocks and environment setting
	const entityBlocks = [
		...characters.map(
			({ elementName, variantName, variantDesc }) =>
				`Character: ${elementName} in ${variantName} variant (${variantDesc}).`,
		),
		...npcs.map(({ elementName, variantName, variantDesc }) =>
			variantName
				? `NPC: ${elementName} in ${variantName} variant (${variantDesc}).`
				: `NPC: ${elementName} (${variantDesc}).`,
		),
		...enemies.map(({ elementName, variantName, variantDesc }) =>
			variantName
				? `Enemy: ${elementName} in ${variantName} variant (${variantDesc}).`
				: `Enemy: ${elementName} (${variantDesc}).`,
		),
		...items.map(({ elementName, variantName, variantDesc }) =>
			variantName
				? `Item: ${elementName} in ${variantName} variant (${variantDesc}).`
				: `Item: ${elementName} (${variantDesc}).`,
		),
	].join('\n');

	const resolvedLocation = location ?? {
		elementName: 'Setting',
		variantName: '',
		variantDesc: locationDesc ?? '',
	};
	const locationLabel = resolvedLocation.variantName
		? `${resolvedLocation.elementName} (${resolvedLocation.variantName})`
		: resolvedLocation.elementName;

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${entityBlocks}
Environment/Setting: ${locationLabel}: ${resolvedLocation.variantDesc}. 
Action/Scene: ${scene}
If reference photos are provided below, use them only for each character's appearance and likeness or each item's appearance. Do not copy a reference photo's pose, expression, camera angle, or background — pose and compose every character and item according to the Action/Scene description above. Make sure characters and items don't look out of proportion to the elements in the setting behind them. Keep everything in natural perspective.
${NO_BORDER_INSTRUCTION}`;
}
