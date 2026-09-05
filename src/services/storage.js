import {
	CHARACTER_ROWS_STORAGE_KEY,
	ENEMY_ROWS_STORAGE_KEY,
	LOCATION_STORAGE_KEY,
	NPC_ROWS_STORAGE_KEY,
	OTHER_LOCATION_TEXT_STORAGE_KEY,
} from '../constants.js';

export function getCharacterRows() {
	try {
		return (
			JSON.parse(localStorage.getItem(CHARACTER_ROWS_STORAGE_KEY)) || []
		);
	} catch {
		return [];
	}
}

export function setCharacterRows(rows) {
	localStorage.setItem(CHARACTER_ROWS_STORAGE_KEY, JSON.stringify(rows));
}

export function getNPCRows() {
	try {
		return JSON.parse(localStorage.getItem(NPC_ROWS_STORAGE_KEY)) || [];
	} catch {
		return [];
	}
}

export function setNPCRows(rows) {
	localStorage.setItem(NPC_ROWS_STORAGE_KEY, JSON.stringify(rows));
}

export function getEnemyRows() {
	try {
		return JSON.parse(localStorage.getItem(ENEMY_ROWS_STORAGE_KEY)) || [];
	} catch {
		return [];
	}
}

export function setEnemyRows(rows) {
	localStorage.setItem(ENEMY_ROWS_STORAGE_KEY, JSON.stringify(rows));
}

export function getOtherLocationText() {
	return localStorage.getItem(OTHER_LOCATION_TEXT_STORAGE_KEY);
}

export function setOtherLocationText(value) {
	localStorage.setItem(OTHER_LOCATION_TEXT_STORAGE_KEY, value);
}

export function getLocationSelection() {
	return localStorage.getItem(LOCATION_STORAGE_KEY);
}

export function setLocationSelection(value) {
	localStorage.setItem(LOCATION_STORAGE_KEY, value);
}
