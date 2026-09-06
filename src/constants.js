export const OTHER_LOCATION_KEY = 'other';

export const CHARACTER_ROWS_STORAGE_KEY = 'ww20CharacterRows';
export const NPC_ROWS_STORAGE_KEY = 'ww20NPCRows';
export const ENEMY_ROWS_STORAGE_KEY = 'ww20EnemyRows';
export const OTHER_LOCATION_TEXT_STORAGE_KEY = 'ww20OtherLocationText';
export const LOCATION_STORAGE_KEY = 'ww20LocationSelect';

export const MAX_NPC_ROWS = 10;
export const MAX_ENEMY_ROWS = 10;
export const STORAGE_SCHEMA_VERSION = 2;

const hostname = globalThis.window?.location?.hostname;

export const SERVER_URL =
	hostname === 'localhost' || hostname === '127.0.0.1'
		? 'http://localhost:3000/generate-image'
		: 'https://rpg-image-generator.onrender.com/generate-image';
