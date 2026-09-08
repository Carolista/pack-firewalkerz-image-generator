import { CUSTOM_LOCATION_REFERENCE_KEY } from './constants.js';

export const NEUTRAL_VOID_SLUG = 'neutral-void';

export function isReferenceModeLocation(location) {
	return location?.slug === NEUTRAL_VOID_SLUG;
}

export function isLocationReferenceMode(location) {
	return location?.elementId === CUSTOM_LOCATION_REFERENCE_KEY;
}

export function buildPrompt({
	characters,
	npcs,
	enemies,
	location,
	locationDesc,
	scene,
}) {
	// Location reference mode: location description only
	if (isLocationReferenceMode(location)) {
		return `Dark fantasy environment concept art in a detailed, atmospheric, painterly digital illustration style.
Depict only the location and its architecture, furnishings, terrain, lighting, and atmosphere.
Do not include any people, characters, animals, monsters, werewolves, humanoid figures, faces, silhouettes, statues, or creature imagery anywhere in the scene, including stained glass, murals, carvings, paintings, or other decorations.
Location: ${locationDesc ?? location?.variantDesc ?? ''}`;
	}

	// Neutral Void reference mode: no entity blocks, subject description from scene
	if (
		isReferenceModeLocation(location) &&
		!characters.length &&
		!npcs.length &&
		!enemies.length
	) {
		return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style.
Render exactly one individual character, NPC, or enemy in the foreground as follows:
${scene}
Keep the Neutral Void background unchanged. Do not modify or replace the background.
If a reference photo is provided below, use it only for the subject's appearance and likeness. Do not copy the reference photo's pose, expression, camera angle, or background.`;
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
	].join('\n');

	const resolvedLocation = location ?? {
		elementName: 'Setting',
		variantName: 'default',
		variantDesc: locationDesc ?? '',
	};
	const locationLabel =
		resolvedLocation.variantName === 'default'
			? resolvedLocation.elementName
			: `${resolvedLocation.elementName} (${resolvedLocation.variantName})`;

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${entityBlocks}
Environment/Setting: ${locationLabel}: ${resolvedLocation.variantDesc}. 
Action/Scene: ${scene}
If reference photos are provided below, use them only for each character's appearance and likeness. Do not copy a reference photo's pose, expression, camera angle, or background — pose and compose every character according to the Action/Scene description above.`;
}
