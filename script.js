import { CUSTOM_LOCATION_REFERENCE_KEY } from './src/constants.js';
import {
	buildPrompt,
	isLocationReferenceMode,
	isReferenceModeLocation,
} from './src/prompt.js';
import {
	generateImageWithNetworkRetry,
	isNetworkError,
	loadReferenceImages,
} from './src/services/api.js';
import { loadCatalog } from './src/services/catalog.js';
import { shareFile } from './src/services/share.js';
import { initAlertModal, showAlert } from './src/ui/alertModal.js';
import { setGenerationBusy } from './src/ui/buttonState.js';
import {
	getCharacterSelections,
	hasAtLeastOneRow as hasAtLeastOneCharacterRow,
	initCharacterRows,
} from './src/ui/characterRows.js';
import {
	getEnemySelections,
	hasAtLeastOneRow as hasAtLeastOneEnemyRow,
	initEnemyRows,
} from './src/ui/enemyRows.js';
import {
	initGenerationOutput,
	resetOutput,
	showEmptyResponse,
	showError,
	showGenerating,
	showSuccess,
} from './src/ui/generationOutput.js';
import {
	getNPCSelections,
	hasAtLeastOneRow as hasAtLeastOneNPCRow,
	initNPCRows,
} from './src/ui/npcRows.js';
import {
	getLocationSelectionDetails,
	initSettingField,
} from './src/ui/settingField.js';

await loadCatalog();

const year = document.getElementById('year');
let currentYear = new Date().getFullYear();
year.innerText =
	String(currentYear) === '2026' ? '2026' : `2026-${currentYear}`;

let generatedBlob = null;
let generationInProgress = false;

const statusText = document.getElementById('statusText');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const retryBtn = document.getElementById('retryBtn');
const sceneText = document.getElementById('sceneText');
const locationSelect = document.getElementById('locationSelect');

const generationControls = { generateBtn, retryBtn };

initCharacterRows({
	container: document.getElementById('characterRows'),
	addBtn: document.getElementById('addCharacterBtn'),
});

initNPCRows({
	container: document.getElementById('npcRows'),
	addBtn: document.getElementById('addNPCBtn'),
});

initEnemyRows({
	container: document.getElementById('enemyRows'),
	addBtn: document.getElementById('addEnemyBtn'),
});

initSettingField({
	selectEl: document.getElementById('locationSelect'),
	variantFieldEl: document.getElementById('locationVariantField'),
	variantSelectEl: document.getElementById('locationVariantSelect'),
	descEl: document.getElementById('locationDescText'),
	otherTextEl: document.getElementById('otherLocationText'),
});

initAlertModal({
	overlay: document.getElementById('alertModalOverlay'),
	closeBtn: document.getElementById('alertModalCloseBtn'),
	messageEl: document.getElementById('alertModalMessage'),
	okBtn: document.getElementById('alertModalOkBtn'),
});

initGenerationOutput({
	status: statusText,
	image: document.getElementById('outputImg'),
	placeholder: document.getElementById('imagePlaceholder'),
	shareBtn,
	downloadBtn,
	retryBtn,
});

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
downloadBtn.addEventListener('click', downloadImage);
resetBtn.addEventListener('click', resetScene);
retryBtn.addEventListener('click', generateSceneImage);

function resetScene() {
	sceneText.value = '';
	resetOutput();
	generatedBlob = null;
}

async function generateSceneImage() {
	if (generationInProgress) return;
	generationInProgress = true;
	setGenerationBusy(generationControls, true);

	try {
		const location = getLocationSelectionDetails();
		if (!location) {
			await showAlert('Please describe the custom setting.');
			return;
		}

		const isLocationRef =
			locationSelect.value === CUSTOM_LOCATION_REFERENCE_KEY ||
			isLocationReferenceMode(location);
		const isNeutralVoidRef = isReferenceModeLocation(location);

		const hasEntities =
			hasAtLeastOneCharacterRow() ||
			hasAtLeastOneNPCRow() ||
			hasAtLeastOneEnemyRow();

		// Location reference mode and Neutral Void reference mode allow no entities
		if (!hasEntities && !isLocationRef && !isNeutralVoidRef) {
			await showAlert(
				'Please add at least one character, NPC, or enemy.',
			);
			return;
		}

		const scene = sceneText.value.trim();

		// Location reference mode doesn't use scene, but Neutral Void does
		if (!isLocationRef && !scene) {
			const sceneLabel = isNeutralVoidRef
				? 'Please describe the new character, NPC, or enemy.'
				: 'Please describe the scene action.';
			await showAlert(sceneLabel);
			return;
		}

		// In reference modes, ignore any saved entities and use empty arrays
		const characters =
			isLocationRef || isNeutralVoidRef ? [] : getCharacterSelections();
		const npcs =
			isLocationRef || isNeutralVoidRef ? [] : getNPCSelections();
		const enemies =
			isLocationRef || isNeutralVoidRef ? [] : getEnemySelections();
		const fullPrompt = buildPrompt({
			characters,
			npcs,
			enemies,
			location,
			locationDesc: isLocationRef ? location.variantDesc : undefined,
			scene,
		});
		const referenceImages = await loadReferenceImages([
			...characters,
			...npcs,
			...enemies,
			location,
		]);

		showGenerating();

		try {
			const result = await generateImageWithNetworkRetry({
				prompt: fullPrompt,
				referenceImages,
				onRetry: () =>
					(statusText.innerText = 'Connection issue, retrying...'),
			});
			if (result.imageUrl) generatedBlob = showSuccess(result);
			else showEmptyResponse(result.raw);
		} catch (err) {
			showError(formatError(err));
		}
	} finally {
		generationInProgress = false;
		setGenerationBusy(generationControls, false);
	}
}

function formatError(error) {
	return isNetworkError(error)
		? 'Could not reach the server. Please try again.'
		: error.message;
}

async function shareImage() {
	if (!generatedBlob) return;
	await shareFile(generatedBlob, {
		filename: 'pack-firewalkerz-scene.jpg',
		mimeType: 'image/jpeg',
		title: 'Pack Firewalkerz Scene',
		text: "Look at what happened in tonight's session!",
	});
}

function downloadImage() {
	if (!generatedBlob) return;
	const url = URL.createObjectURL(generatedBlob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'pack-firewalkerz-scene.jpg';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
