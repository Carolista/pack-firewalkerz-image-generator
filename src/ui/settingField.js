import { OTHER_LOCATION_KEY } from '../constants.js';
import PACK_DATA from '../packData.json' with { type: 'json' };
import {
	getLocationSelection,
	getOtherLocationText,
	setLocationSelection,
	setOtherLocationText,
} from '../services/storage.js';

let selectEl;
let descEl;
let otherTextEl;

export function initSettingField({
	selectEl: select,
	descEl: desc,
	otherTextEl: otherText,
}) {
	selectEl = select;
	descEl = desc;
	otherTextEl = otherText;

	populateLocationSelect();
	restoreLocationSelection();
	restoreOtherLocationText();
	updateLocationDescDisplay();

	selectEl.addEventListener('change', () => {
		persistLocationSelection();
		updateLocationDescDisplay();
	});
	otherTextEl.addEventListener('input', persistOtherLocationText);
}

export function getLocationDescription() {
	if (selectEl.value === OTHER_LOCATION_KEY) {
		return otherTextEl.value.trim() || null;
	}
	return PACK_DATA.settings[selectEl.value].description;
}

function populateLocationSelect() {
	for (const [key, setting] of Object.entries(PACK_DATA.settings)) {
		selectEl.add(new Option(setting.name, key));
	}
	selectEl.add(new Option('Other (describe below)', OTHER_LOCATION_KEY));
}

function updateLocationDescDisplay() {
	const isOther = selectEl.value === OTHER_LOCATION_KEY;
	descEl.hidden = isOther;
	otherTextEl.hidden = !isOther;
	if (!isOther) {
		descEl.textContent =
			PACK_DATA.settings[selectEl.value]?.description ?? '';
	}
}

function restoreLocationSelection() {
	const storedValue = getLocationSelection();
	if (
		storedValue &&
		[...selectEl.options].some(o => o.value === storedValue)
	) {
		selectEl.value = storedValue;
	}
}

function persistLocationSelection() {
	setLocationSelection(selectEl.value);
}

function restoreOtherLocationText() {
	const storedText = getOtherLocationText();
	if (storedText) otherTextEl.value = storedText;
}

function persistOtherLocationText() {
	setOtherLocationText(otherTextEl.value);
}
