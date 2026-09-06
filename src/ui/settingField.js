import { OTHER_LOCATION_KEY } from '../constants.js';
import { getElements, getVariantById } from '../services/catalog.js';
import {
	getLocationSelection,
	getOtherLocationText,
	setLocationSelection,
	setOtherLocationText,
} from '../services/storage.js';

const LOCATIONS = getElements('location');

let selectEl;
let variantFieldEl;
let variantSelectEl;
let descEl;
let otherTextEl;
let restoredVariantId;

export function initSettingField({
	selectEl: select,
	variantFieldEl: variantField,
	variantSelectEl: variantSelect,
	descEl: desc,
	otherTextEl: otherText,
}) {
	selectEl = select;
	variantFieldEl = variantField;
	variantSelectEl = variantSelect;
	descEl = desc;
	otherTextEl = otherText;

	populateLocationSelect();
	restoreLocationSelection();
	restoreOtherLocationText();
	updateLocationDisplay();

	selectEl.addEventListener('change', () => {
		persistLocationSelection();
		updateLocationDisplay();
	});
	variantSelectEl.addEventListener('change', () => {
		persistLocationSelection();
		updateLocationDisplay();
	});
	otherTextEl.addEventListener('input', persistOtherLocationText);
}

export function getLocationDescription() {
	return getLocationSelectionDetails()?.variantDesc ?? null;
}

export function getLocationSelectionDetails() {
	if (selectEl.value === OTHER_LOCATION_KEY) {
		const variantDesc = otherTextEl.value.trim();
		return variantDesc
			? {
					elementId: OTHER_LOCATION_KEY,
					elementType: 'location',
					elementName: 'Custom location',
					variantId: OTHER_LOCATION_KEY,
					variantName: 'default',
					variantDesc,
					image: '',
				}
			: null;
	}
	const location = getLocation(selectEl.value);
	const variant = getVariantById(location, variantSelectEl.value);
	return variant
		? {
				elementId: location.id,
				elementType: location.elementType,
				elementName: location.name,
				variantId: variant.variantId,
				variantName: variant.variantName,
				variantDesc: variant.variantDesc,
				image: variant.image,
			}
		: null;
}

function getLocation(elementId) {
	return LOCATIONS.find(location => location.id === elementId);
}

function populateLocationSelect() {
	for (const location of LOCATIONS) {
		selectEl.add(new Option(location.name, location.id));
	}
	selectEl.add(new Option('Other (describe below)', OTHER_LOCATION_KEY));
}

function updateVariantSelect(location, presetVariantId) {
	variantSelectEl.replaceChildren();
	for (const variant of location.variants) {
		variantSelectEl.add(new Option(variant.variantName, variant.variantId));
	}
	if (presetVariantId && getVariantById(location, presetVariantId)) {
		variantSelectEl.value = presetVariantId;
	}
	variantFieldEl.hidden = location.variants.length <= 1;
}

function updateLocationDisplay() {
	const isOther = selectEl.value === OTHER_LOCATION_KEY;
	descEl.hidden = isOther;
	otherTextEl.hidden = !isOther;
	variantFieldEl.hidden = true;
	if (isOther) return;

	const location = getLocation(selectEl.value);
	if (!location) return;
	updateVariantSelect(location, restoredVariantId ?? variantSelectEl.value);
	restoredVariantId = undefined;
	descEl.textContent = getLocationDescription() ?? '';
}

function restoreLocationSelection() {
	const stored = getLocationSelection();
	const storedValue = stored?.elementId;
	restoredVariantId = stored?.variantId;
	if (
		storedValue &&
		[...selectEl.options].some(o => o.value === storedValue)
	) {
		selectEl.value = storedValue;
	}
}

function persistLocationSelection() {
	if (selectEl.value === OTHER_LOCATION_KEY) {
		setLocationSelection(OTHER_LOCATION_KEY);
		return;
	}
	setLocationSelection({
		elementId: selectEl.value,
		variantId: variantSelectEl.value,
	});
}

function restoreOtherLocationText() {
	const storedText = getOtherLocationText();
	if (storedText) otherTextEl.value = storedText;
}

function persistOtherLocationText() {
	setOtherLocationText(otherTextEl.value);
}
