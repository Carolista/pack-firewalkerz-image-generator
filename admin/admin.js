import { getRoute, navigateTo } from './routing.js';
import { createAdminDataClient } from './services/adminData.js';
import { createAuthClient } from './services/auth.js';
import { createStorageService } from './services/storageService.js';
import { createCatalogView } from './ui/catalogView.js';
import { createDetailsView } from './ui/detailsView.js';
import { createFormView } from './ui/formView.js';
import { createModalController } from './ui/modals.js';

const CATEGORIES = {
	character: {
		shortSingular: 'PC',
		shortPlural: 'PCs',
		longSingular: 'Player Character',
		longPlural: 'Player Characters',
		faClasses: 'fa-solid fa-paw-claws',
	},
	npc: {
		shortSingular: 'NPC',
		shortPlural: 'NPCs',
		longSingular: 'Non-Player Character',
		longPlural: 'Non-Player Characters',
		faClasses: 'fa-solid fa-people',
	},
	enemy: {
		shortSingular: 'Enemy',
		shortPlural: 'Enemies',
		longSingular: 'Enemy',
		longPlural: 'Enemies',
		faClasses: 'fa-solid fa-face-angry-horns',
	},
	location: {
		shortSingular: 'Location',
		shortPlural: 'Locations',
		longSingular: 'Location',
		longPlural: 'Locations',
		faClasses: 'fa-solid fa-circle-location-arrow',
	},
};

let activeCategory = 'character';
const authClient = createAuthClient({
	onSessionExpired: showReauthenticationModal,
});
const dataClient = createAdminDataClient(
	() => authClient.getSession(),
	() => authClient.reauthenticate(),
);
const storageService = createStorageService(
	() => authClient.getSession(),
	() => authClient.reauthenticate(),
);

const loginPanel = document.getElementById('login-panel');
const catalogPanel = document.getElementById('catalog-panel');
const detailsContainer = document.getElementById('details-container');
const detailsContent = document.getElementById('details-content');
const detailsBackBtn = document.getElementById('details-back-btn');
const formContainer = document.getElementById('form-container');
const formHeading = document.getElementById('form-heading');
const elementForm = document.getElementById('element-form');
const formCategory = document.getElementById('form-category');
const formName = document.getElementById('form-name');
const formSlug = document.getElementById('form-slug');
const formStatus = document.getElementById('form-status');
const variantFormRows = document.getElementById('variant-form-rows');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const catalogStatus = document.getElementById('catalog-status');
const categoryTabs = document.getElementById('category-tabs');
const elementList = document.getElementById('element-list');
const signOutBtn = document.getElementById('sign-out-btn');
const addElementBtn = document.getElementById('add-element-btn');
const reauthModalOverlay = document.getElementById('reauth-modal-overlay');
const reauthForm = document.getElementById('reauth-form');
const reauthStatus = document.getElementById('reauth-status');
const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
const confirmModalHeading = document.getElementById('confirm-modal-heading');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalCancelBtn = document.getElementById(
	'confirm-modal-cancel-btn',
);
const confirmModalExtraBtn = document.getElementById('confirm-modal-extra-btn');
const confirmModalConfirmBtn = document.getElementById(
	'confirm-modal-confirm-btn',
);

const modals = createModalController({
	reauthOverlay: reauthModalOverlay,
	reauthForm,
	reauthStatus,
	confirmOverlay: confirmModalOverlay,
	confirmHeading: confirmModalHeading,
	confirmMessage: confirmModalMessage,
	confirmCancelBtn: confirmModalCancelBtn,
	confirmExtraBtn: confirmModalExtraBtn,
	confirmConfirmBtn: confirmModalConfirmBtn,
	onReauthenticate: reauthenticate,
});
const formView = createFormView({
	formContainer,
	formHeading,
	elementForm,
	formCategory,
	formName,
	formSlug,
	formStatus,
	formSaveBtn: document.getElementById('form-save-btn'),
	variantFormRows,
	addVariantBtn: document.getElementById('add-variant-btn'),
	dataClient,
	storageService,
	modals,
	navigateTo,
	getRoute,
	categories: CATEGORIES,
});
const catalogView = createCatalogView({
	categories: CATEGORIES,
	categoryTabs,
	categoryHeading: document.querySelector('#catalog-panel > h2'),
	catalogStatus,
	elementList,
	addElementBtn,
	dataClient,
	storageService,
	modals,
	navigateTo,
	getActiveCategory: () => activeCategory,
	setActiveCategory: category => {
		activeCategory = category;
	},
});
const detailsView = createDetailsView({
	container: detailsContainer,
	content: detailsContent,
	status: catalogStatus,
	dataClient,
	storageService,
	modals,
	navigateTo,
});
loginForm.addEventListener('submit', signIn);
signOutBtn.addEventListener('click', signOut);
addElementBtn.addEventListener('click', () => {
	navigateTo({ name: 'add', category: activeCategory });
});
detailsBackBtn.addEventListener('click', () => {
	navigateTo({ name: 'view', category: activeCategory });
});
document.getElementById('form-back-btn').addEventListener('click', () => {
	formView.requestNavigation();
});
document.getElementById('form-cancel-btn').addEventListener('click', () => {
	formView.requestNavigation();
});
window.addEventListener('hashchange', renderShell);

renderShell();

async function signIn(event) {
	event.preventDefault();
	setStatus(loginStatus, 'Signing in...');
	try {
		await authClient.signIn(
			document.getElementById('email-input').value,
			document.getElementById('password-input').value,
		);
		setStatus(loginStatus, '');
		await renderShell();
	} catch (error) {
		setStatus(loginStatus, error.message);
	}
}

function showReauthenticationModal() {
	modals.showReauthentication();
}

async function reauthenticate(event) {
	event.preventDefault();
	const status = modals.getReauthenticationStatusElement();
	setStatus(status, 'Signing in...');
	try {
		await authClient.completeReauthentication(
			document.getElementById('reauth-email-input').value,
			document.getElementById('reauth-password-input').value,
		);
		modals.completeReauthentication();
		setStatus(status, '');
	} catch (error) {
		setStatus(status, error.message);
	}
}

async function signOut() {
	await authClient.signOut();
	renderShell();
}

async function renderShell() {
	const authenticated = Boolean(authClient.getSession()?.access_token);
	loginPanel.hidden = authenticated;
	const route = getRoute();
	if (route?.category) activeCategory = route.category;
	const detailsRoute = route?.name === 'details' ? route : null;
	const formRoute = ['add', 'edit'].includes(route?.name) ? route : null;
	catalogPanel.hidden = !authenticated || Boolean(detailsRoute || formRoute);
	detailsContainer.hidden = !authenticated || !detailsRoute;
	formContainer.hidden = !authenticated || !formRoute;
	signOutBtn.hidden = !authenticated;
	if (!authenticated) return;
	catalogView.renderTabs();
	if (detailsRoute) await detailsView.load(detailsRoute);
	else if (formRoute) await formView.load(formRoute);
	else await catalogView.loadElements();
}

function setStatus(element, message) {
	element.textContent = message;
}
