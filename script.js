import { buildPrompt } from './src/prompt.js';
import {
	generateImageWithNetworkRetry,
	isNetworkError,
	loadReferenceImages,
} from './src/services/api.js';
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
	getLocationDescription,
	initSettingField,
} from './src/ui/settingField.js';

const year = document.getElementById('year');
let currentYear = new Date().getFullYear();
year.innerText =
	String(currentYear) === '2026' ? '2026' : `2026-${currentYear}`;

let generatedBlob = null;
let generationInProgress = false;

const statusText = document.getElementById('statusText');
const generateBtn = document.getElementById('generateBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');
const retryBtn = document.getElementById('retryBtn');
const sceneText = document.getElementById('sceneText');

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
	retryBtn,
});

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
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
		if (
			!hasAtLeastOneCharacterRow() &&
			!hasAtLeastOneNPCRow() &&
			!hasAtLeastOneEnemyRow()
		) {
			await showAlert(
				'Please add at least one character, NPC, or enemy.',
			);
			return;
		}

		const locationDesc = getLocationDescription();
		if (!locationDesc) {
			await showAlert('Please describe the custom setting.');
			return;
		}

		const scene = sceneText.value.trim();
		if (!scene) {
			await showAlert('Please describe the scene action.');
			return;
		}

		const characters = getCharacterSelections();
		const npcs = getNPCSelections();
		const enemies = getEnemySelections();
		const fullPrompt = buildPrompt({
			characters,
			npcs,
			enemies,
			locationDesc,
			scene,
		});
		const referenceImages = await loadReferenceImages([
			...characters,
			...npcs,
			...enemies,
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
		filename: 'ww20-scene.jpg',
		mimeType: 'image/jpeg',
		title: 'WW20 Session Moment',
		text: "Look at what happened in tonight's session!",
	});
}
