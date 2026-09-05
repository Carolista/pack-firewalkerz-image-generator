export function buildPrompt({
	characters,
	npcs,
	monsters,
	locationDesc,
	scene,
}) {
	const entityBlocks = [
		...characters.map(
			({ name, formName, formDesc }) =>
				`Character: ${name} in ${formName} form (${formDesc}).`,
		),
		...npcs.map(
			({ name, description }) => `NPC: ${name} (${description}).`,
		),
		...monsters.map(
			({ name, description }) => `Monster: ${name} (${description}).`,
		),
	].join('\n');

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${entityBlocks}
Environment/Setting: ${locationDesc}. 
Action/Scene: ${scene}
If reference photos are provided below, use them only for each character's appearance and likeness. Do not copy a reference photo's pose, expression, camera angle, or background — pose and compose every character according to the Action/Scene description above.`;
}
