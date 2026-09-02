import {
	API_KEY_STORAGE_KEY,
	CHARACTER_ROWS_STORAGE_KEY,
	LOCATION_STORAGE_KEY,
	OTHER_LOCATION_TEXT_STORAGE_KEY,
} from '../constants.js';

export function getApiKey() {
	return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKeyIfChanged(value) {
	if (value && value !== localStorage.getItem(API_KEY_STORAGE_KEY)) {
		localStorage.setItem(API_KEY_STORAGE_KEY, value);
	}
}

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
