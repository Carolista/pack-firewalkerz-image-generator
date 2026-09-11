import {
	CUSTOM_LOCATION_REFERENCE_KEY,
	OTHER_LOCATION_KEY,
} from '../constants.js';
import { NEUTRAL_VOID_SLUG, isLocationReferenceMode } from '../prompt.js';
import { getElements, getVariantById } from '../services/catalog.js';
import {
	getLocationSelection,
	getOtherLocationText,
	setLocationSelection,
	setOtherLocationText,
} from '../services/storage.js';

let locations;

let selectEl;
let variantFieldEl;
let variantSelectEl;
let descEl;
let otherTextEl;
let restoredVariantId;
let sceneHeadingEl;
let sceneHintEl;

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
	sceneHeadingEl = document.getElementById('sceneHeading');
	sceneHintEl = document.getElementById('sceneHint');
	locations = getElements('location');

	populateLocationSelect();
	restoreLocationSelection();
	restoreOtherLocationText();
	updateLocationDisplay();
	updateSceneUI();

	selectEl.addEventListener('change', () => {
		persistLocationSelection();
		updateLocationDisplay();
		updateSceneUI();
	});
	variantSelectEl.addEventListener('change', () => {
		persistLocationSelection();
		updateLocationDisplay();
		updateSceneUI();
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
					elementName: 'Custom Location',
					variantId: OTHER_LOCATION_KEY,
					variantName: 'default',
					variantDesc,
					image: '',
					slug: null,
				}
			: null;
	}
	if (selectEl.value === CUSTOM_LOCATION_REFERENCE_KEY) {
		const variantDesc = otherTextEl.value.trim();
		return variantDesc
			? {
					elementId: CUSTOM_LOCATION_REFERENCE_KEY,
					elementType: 'location',
					elementName: 'Custom Location (for reference images)',
					variantId: CUSTOM_LOCATION_REFERENCE_KEY,
					variantName: 'reference',
					variantDesc,
					image: '',
					slug: null,
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
				slug: location.slug,
			}
		: null;
}

function getLocation(elementId) {
	return locations.find(location => location.id === elementId);
}

function populateLocationSelect() {
	// Neutral Void and the custom reference-image option are admin-only; excluded from the public dropdown.
	for (const location of locations) {
		if (location.slug !== NEUTRAL_VOID_SLUG) {
			selectEl.add(new Option(location.name, location.id));
		}
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
	const isCustomReference = selectEl.value === CUSTOM_LOCATION_REFERENCE_KEY;
	const usesTextarea = isOther || isCustomReference;

	descEl.hidden = usesTextarea;
	otherTextEl.hidden = !usesTextarea;
	variantFieldEl.hidden = true;
	if (usesTextarea) return;

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
	if (selectEl.value === CUSTOM_LOCATION_REFERENCE_KEY) {
		setLocationSelection(CUSTOM_LOCATION_REFERENCE_KEY);
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

function updateSceneUI() {
	const location = getLocationSelectionDetails();
	const isNeutralVoidReference = location?.slug === NEUTRAL_VOID_SLUG;
	const isLocationReference =
		selectEl.value === CUSTOM_LOCATION_REFERENCE_KEY ||
		isLocationReferenceMode(location);

	const characterCard = document.getElementById('characterCard');
	const npcCard = document.getElementById('npcCard');
	const enemyCard = document.getElementById('enemyCard');
	const sceneCard = document
		.querySelector('[id="sceneHeading"]')
		?.closest('.card');

	if (isNeutralVoidReference) {
		sceneHeadingEl.textContent = 'Reference Subject';
		sceneHintEl.textContent =
			'Describe the new character, NPC, or enemy to be rendered as a reference image against the Neutral Void background.';
		characterCard.style.display = 'none';
		npcCard.style.display = 'none';
		enemyCard.style.display = 'none';
		sceneCard.style.display = 'block';
	} else if (isLocationReference) {
		sceneHeadingEl.textContent = 'Location Reference';
		sceneHintEl.textContent =
			'Describe the location to be rendered as a reference image.';
		characterCard.style.display = 'none';
		npcCard.style.display = 'none';
		enemyCard.style.display = 'none';
		sceneCard.style.display = 'none';
	} else {
		sceneHeadingEl.textContent = 'Scene Activity';
		sceneHintEl.textContent =
			'Describe actions, facial expressions, placement of characters within the setting, any items or props present, etc.';
		characterCard.style.display = 'block';
		npcCard.style.display = 'block';
		enemyCard.style.display = 'block';
		if (sceneCard) sceneCard.style.display = 'block';
	}
}
