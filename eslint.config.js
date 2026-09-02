import eslintConfigPrettier from 'eslint-config-prettier';

const browserGlobals = {
	window: 'readonly',
	document: 'readonly',
	navigator: 'readonly',
	localStorage: 'readonly',
	fetch: 'readonly',
	File: 'readonly',
	console: 'readonly',
	alert: 'readonly',
};

const nodeGlobals = {
	process: 'readonly',
	console: 'readonly',
};

export default [
	{ ignores: ['node_modules/**'] },
	{
		files: ['script.js', 'src/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: browserGlobals,
		},
	},
	{
		files: ['server.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: nodeGlobals,
		},
	},
	eslintConfigPrettier,
];
