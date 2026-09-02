export function buildPrompt({ characters, locationDesc, scene }) {
	const characterBlocks = characters
		.map(
			({ name, formName, formDesc }) =>
				`Character: ${name} in ${formName} form (${formDesc}).`,
		)
		.join('\n');

	return `Dark fantasy illustration, World of Darkness Werewolf: The Apocalypse RPG style. 
${characterBlocks}
Environment/Setting: ${locationDesc}. 
Action/Scene: ${scene}`;
}
