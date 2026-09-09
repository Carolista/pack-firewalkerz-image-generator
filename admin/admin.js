import { getRoute, navigateTo } from './routing.js';
import { createAdminDataClient } from './services/adminData.js';
import { createAuthClient } from './services/auth.js';
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

const loginPanel = document.getElementById('loginPanel');
const catalogPanel = document.getElementById('catalogPanel');
const detailsContainer = document.getElementById('detailsContainer');
const detailsContent = document.getElementById('detailsContent');
const detailsBackBtn = document.getElementById('detailsBackBtn');
const formContainer = document.getElementById('formContainer');
const formHeading = document.getElementById('formHeading');
const elementForm = document.getElementById('elementForm');
const formCategory = document.getElementById('formCategory');
const formName = document.getElementById('formName');
const formSlug = document.getElementById('formSlug');
const formStatus = document.getElementById('formStatus');
const variantFormRows = document.getElementById('variantFormRows');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const catalogStatus = document.getElementById('catalogStatus');
const categoryTabs = document.getElementById('categoryTabs');
const elementList = document.getElementById('elementList');
const signOutBtn = document.getElementById('signOutBtn');
const addElementBtn = document.getElementById('addElementBtn');
const reauthModalOverlay = document.getElementById('reauthModalOverlay');
const reauthForm = document.getElementById('reauthForm');
const reauthStatus = document.getElementById('reauthStatus');
const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmModalHeading = document.getElementById('confirmModalHeading');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
const confirmModalConfirmBtn = document.getElementById(
	'confirmModalConfirmBtn',
);

const modals = createModalController({
	reauthOverlay: reauthModalOverlay,
	reauthForm,
	reauthStatus,
	confirmOverlay: confirmModalOverlay,
	confirmHeading: confirmModalHeading,
	confirmMessage: confirmModalMessage,
	confirmCancelBtn: confirmModalCancelBtn,
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
	variantFormRows,
	addVariantBtn: document.getElementById('addVariantBtn'),
	dataClient,
	modals,
	navigateTo,
	getRoute,
	categories: CATEGORIES,
});
const catalogView = createCatalogView({
	categories: CATEGORIES,
	categoryTabs,
	categoryHeading: document.querySelector('#catalogPanel > h2'),
	catalogStatus,
	elementList,
	addElementBtn,
	dataClient,
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
	modals,
});
loginForm.addEventListener('submit', signIn);
signOutBtn.addEventListener('click', signOut);
addElementBtn.addEventListener('click', () => {
	navigateTo({ name: 'add', category: activeCategory });
});
detailsBackBtn.addEventListener('click', () => {
	navigateTo({ name: 'view', category: activeCategory });
});
document.getElementById('formBackBtn').addEventListener('click', () => {
	formView.requestNavigation();
});
document.getElementById('formCancelBtn').addEventListener('click', () => {
	formView.requestNavigation();
});
window.addEventListener('hashchange', renderShell);

renderShell();

async function signIn(event) {
	event.preventDefault();
	setStatus(loginStatus, 'Signing in...');
	try {
		await authClient.signIn(
			document.getElementById('emailInput').value,
			document.getElementById('passwordInput').value,
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
			document.getElementById('reauthEmailInput').value,
			document.getElementById('reauthPasswordInput').value,
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
