export function buildPrompt({
	characters,
	npcs,
	enemies,
	locationDesc,
	scene,
}) {
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

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${entityBlocks}
Environment/Setting: ${locationDesc}. 
Action/Scene: ${scene}
If reference photos are provided below, use them only for each character's appearance and likeness. Do not copy a reference photo's pose, expression, camera angle, or background — pose and compose every character according to the Action/Scene description above.`;
}
