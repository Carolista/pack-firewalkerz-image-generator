import { ADMIN_SESSION_KEY, createAuthClient } from './admin/services/auth.js';
import { CUSTOM_LOCATION_REFERENCE_KEY } from './src/constants.js';
import {
	buildPrompt,
	buildSceneOnlyPrompt,
	isLocationReferenceMode,
	isReferenceModeLocation,
} from './src/prompt.js';
import {
	generateImageWithNetworkRetry,
	isNetworkError,
	loadReferenceImages,
} from './src/services/api.js';
import { ADMIN_CATALOG_ACTIVE, loadCatalog } from './src/services/catalog.js';
import { downloadBlob, filenameForBlob } from './src/services/download.js';
import { createShareFile, shareFile } from './src/services/share.js';
import { initAlertModal, showAlert } from './src/ui/alertModal.js';
import { setGenerationBusy } from './src/ui/buttonState.js';
import {
	initCatalogPreviewModal,
	showCatalogPreview,
} from './src/ui/catalogPreviewModal.js';
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
	getItemSelections,
	hasAtLeastOneRow as hasAtLeastOneItemRow,
	initItemRows,
} from './src/ui/itemRows.js';
import {
	getNPCSelections,
	hasAtLeastOneRow as hasAtLeastOneNPCRow,
	initNPCRows,
} from './src/ui/npcRows.js';
import {
	getLocationSelectionDetails,
	initSettingField,
} from './src/ui/settingField.js';
import { initSignInModal } from './src/ui/signInModal.js';

const authClient = createAuthClient();
let catalogUnavailable = false;
try {
	await loadCatalog({
		adminAccessToken: authClient.getSession()?.access_token,
	});
} catch {
	catalogUnavailable = true;
}

const year = document.getElementById('year');
let currentYear = new Date().getFullYear();
year.innerText =
	String(currentYear) === '2026' ? '2026' : `2026-${currentYear}`;

let generatedBlob = null;
let generationInProgress = false;

const statusText = document.getElementById('status-text');
const generateBtn = document.getElementById('generate-btn');
const shareBtn = document.getElementById('share-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const retryBtn = document.getElementById('retry-btn');
const sceneText = document.getElementById('scene-text');
const locationSelect = document.getElementById('location-select');
const signInBtn = document.getElementById('public-sign-in-btn');
const signOutBtn = document.getElementById('public-sign-out-btn');
const signInForm = document.getElementById('public-sign-in-form');
const signInModal = initSignInModal({
	overlay: document.getElementById('public-sign-in-overlay'),
	closeBtn: document.getElementById('public-sign-in-close-btn'),
	form: signInForm,
	status: document.getElementById('public-sign-in-status'),
});

signInBtn.hidden = ADMIN_CATALOG_ACTIVE;
document.getElementById('admin-catalog-controls').hidden =
	!ADMIN_CATALOG_ACTIVE;
signInBtn.addEventListener('click', () => signInModal.open());
signInForm.addEventListener('submit', async event => {
	event.preventDefault();
	signInModal.setBusy(true);
	signInModal.setStatus('Signing in...');
	try {
		await authClient.signIn(
			signInForm.querySelector('[type="email"]').value,
			signInForm.querySelector('[type="password"]').value,
		);
		await loadCatalog({
			adminAccessToken: authClient.getSession()?.access_token,
		});
		if (!ADMIN_CATALOG_ACTIVE) {
			await authClient.signOut();
			throw new Error('This account cannot access the admin catalog.');
		}
		window.location.reload();
	} catch (error) {
		signInModal.setStatus(error.message);
	} finally {
		signInModal.setBusy(false);
	}
});
signOutBtn.addEventListener('click', async () => {
	signOutBtn.disabled = true;
	try {
		await authClient.signOut();
		window.location.reload();
	} finally {
		signOutBtn.disabled = false;
	}
});
window.addEventListener('storage', event => {
	if (event.key === ADMIN_SESSION_KEY) window.location.reload();
});

const generationControls = { generateBtn, retryBtn };

function getGenerationControls() {
	return [
		resetBtn,
		locationSelect,
		document.getElementById('location-preview-btn'),
		document.getElementById('location-variant-select'),
		document.getElementById('other-location-text'),
		document.getElementById('scene-text'),
		...document.querySelectorAll(
			'#character-card button, #character-card select, #npc-card button, #npc-card select, #enemy-card button, #enemy-card select, #item-card button, #item-card select',
		),
	];
}

initCharacterRows({
	container: document.getElementById('character-rows'),
	addBtn: document.getElementById('add-character-btn'),
	onPreview: showCatalogPreview,
});

initNPCRows({
	container: document.getElementById('npc-rows'),
	addBtn: document.getElementById('add-npc-btn'),
	onPreview: showCatalogPreview,
});

initEnemyRows({
	container: document.getElementById('enemy-rows'),
	addBtn: document.getElementById('add-enemy-btn'),
	onPreview: showCatalogPreview,
});

initItemRows({
	container: document.getElementById('item-rows'),
	addBtn: document.getElementById('add-item-btn'),
	onPreview: showCatalogPreview,
});

initSettingField({
	selectEl: document.getElementById('location-select'),
	variantFieldEl: document.getElementById('location-variant-field'),
	variantSelectEl: document.getElementById('location-variant-select'),
	otherTextEl: document.getElementById('other-location-text'),
	previewBtn: document.getElementById('location-preview-btn'),
	onPreview: showCatalogPreview,
});

if (catalogUnavailable) {
	for (const panel of document.querySelectorAll(
		'#setting-card, #character-card, #npc-card, #enemy-card, #item-card',
	)) {
		panel.hidden = true;
	}
	document.getElementById('catalog-unavailable-notice').hidden = false;
	document.getElementById('scene-hint').hidden = true;
}

initCatalogPreviewModal({
	overlay: document.getElementById('catalog-preview-overlay'),
	closeBtn: document.getElementById('catalog-preview-close-btn'),
	heading: document.getElementById('catalog-preview-heading'),
	grid: document.getElementById('catalog-preview-grid'),
});

initAlertModal({
	overlay: document.getElementById('alert-modal-overlay'),
	closeBtn: document.getElementById('alert-modal-close-btn'),
	messageEl: document.getElementById('alert-modal-message'),
	okBtn: document.getElementById('alert-modal-ok-btn'),
});

initGenerationOutput({
	status: statusText,
	image: document.getElementById('output-img'),
	placeholder: document.getElementById('image-placeholder'),
	shareBtn,
	shareFallback: document.getElementById('share-fallback'),
	downloadBtn,
	retryBtn,
});

generateBtn.addEventListener('click', generateSceneImage);
shareBtn.addEventListener('click', shareImage);
copyLinkBtn.addEventListener('click', copyPageLink);
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
	setGenerationBusy(
		{ ...generationControls, controls: getGenerationControls() },
		true,
	);

	try {
		const scene = sceneText.value.trim();
		if (catalogUnavailable) {
			if (!scene) {
				await showAlert('Please describe the scene action.');
				return;
			}
			await generateWithPrompt(buildSceneOnlyPrompt(scene), []);
			return;
		}

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
			hasAtLeastOneEnemyRow() ||
			hasAtLeastOneItemRow();

		// Location reference mode and Neutral Void reference mode allow no entities
		if (!hasEntities && !isLocationRef && !isNeutralVoidRef) {
			await showAlert(
				'Please add at least one character, NPC, enemy, or item.',
			);
			return;
		}

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
		const items =
			isLocationRef || isNeutralVoidRef ? [] : getItemSelections();
		const fullPrompt = buildPrompt({
			characters,
			npcs,
			enemies,
			items,
			location,
			locationDesc: isLocationRef ? location.variantDesc : undefined,
			scene,
		});
		const referenceImages = await loadReferenceImages([
			...characters,
			...npcs,
			...enemies,
			...items,
			location,
		]);
		await generateWithPrompt(fullPrompt, referenceImages);
	} finally {
		generationInProgress = false;
		setGenerationBusy(
			{ ...generationControls, controls: getGenerationControls() },
			false,
		);
	}
}

async function generateWithPrompt(prompt, referenceImages) {
	showGenerating();
	try {
		const result = await generateImageWithNetworkRetry({
			prompt,
			referenceImages,
			onRetry: () =>
				(statusText.innerText = 'Connection issue, retrying...'),
		});
		if (result.imageUrl) generatedBlob = showSuccess(result);
		else showEmptyResponse(result.raw);
	} catch (err) {
		showError(formatError(err));
	}
}

function formatError(error) {
	return isNetworkError(error)
		? 'Could not reach the server. Please try again.'
		: error.message;
}

async function shareImage() {
	if (!generatedBlob) return;
	await shareFile(createShareFile(generatedBlob, 'pack-firewalkerz-scene'), {
		title: 'Pack Firewalkerz Scene',
		text: "Look at what happened in tonight's session!",
	});
}

async function copyPageLink() {
	try {
		await navigator.clipboard.writeText(window.location.href);
		copyLinkBtn.textContent = 'Link Copied';
	} catch {
		copyLinkBtn.textContent = 'Copy Failed';
	}
}

function downloadImage() {
	if (!generatedBlob) return;
	downloadBlob(
		generatedBlob,
		filenameForBlob(generatedBlob, 'pack-firewalkerz-scene'),
	);
}
