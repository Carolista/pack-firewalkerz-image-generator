import {
	CHARACTER_ROWS_STORAGE_KEY,
	ENEMY_ROWS_STORAGE_KEY,
	LOCATION_STORAGE_KEY,
	NPC_ROWS_STORAGE_KEY,
	OTHER_LOCATION_TEXT_STORAGE_KEY,
	STORAGE_SCHEMA_VERSION,
} from '../constants.js';

function getJsonValue(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw);
		if (parsed.version !== STORAGE_SCHEMA_VERSION) {
			localStorage.removeItem(key);
			return fallback;
		}
		return parsed.data;
	} catch {
		localStorage.removeItem(key);
		return fallback;
	}
}

function setJsonValue(key, value) {
	localStorage.setItem(
		key,
		JSON.stringify({ version: STORAGE_SCHEMA_VERSION, data: value }),
	);
}

export function getCharacterRows() {
	return getJsonValue(CHARACTER_ROWS_STORAGE_KEY, []);
}

export function setCharacterRows(rows) {
	setJsonValue(CHARACTER_ROWS_STORAGE_KEY, rows);
}

export function getNPCRows() {
	return getJsonValue(NPC_ROWS_STORAGE_KEY, []);
}

export function setNPCRows(rows) {
	setJsonValue(NPC_ROWS_STORAGE_KEY, rows);
}

export function getEnemyRows() {
	return getJsonValue(ENEMY_ROWS_STORAGE_KEY, []);
}

export function setEnemyRows(rows) {
	setJsonValue(ENEMY_ROWS_STORAGE_KEY, rows);
}

export function getOtherLocationText() {
	return localStorage.getItem(OTHER_LOCATION_TEXT_STORAGE_KEY);
}

export function setOtherLocationText(value) {
	localStorage.setItem(OTHER_LOCATION_TEXT_STORAGE_KEY, value);
}

export function getLocationSelection() {
	return getJsonValue(LOCATION_STORAGE_KEY, null);
}

export function setLocationSelection(value) {
	setJsonValue(LOCATION_STORAGE_KEY, value);
}
