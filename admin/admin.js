import { SUPABASE_URL } from '../src/services/supabaseConfig.js';
import { createAdminDataClient } from './adminData.js';
import { createAuthClient } from './auth.js';
import { createCatalogView } from './catalogView.js';
import { createFormView } from './formView.js';
import { createModalController } from './modals.js';
import { getRoute, navigateTo } from './routing.js';

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
	if (detailsRoute) await loadDetails(detailsRoute);
	else if (formRoute) await formView.load(formRoute);
	else await catalogView.loadElements();
}

async function loadDetails(route) {
	catalogPanel.hidden = true;
	detailsContainer.hidden = false;
	detailsContent.replaceChildren();
	setStatus(catalogStatus, '');
	try {
		const [element] = await dataClient.getElementBySlug(route.slug);
		if (!element) throw new Error('Element not found.');
		activeCategory = route.category;
		detailsContent.append(renderDetails(element));
	} catch (error) {
		setStatus(catalogStatus, error.message);
	}
}

function sortAdminVariants(variants = []) {
	return [...variants].sort((left, right) => {
		const leftOrder = left.sort_order;
		const rightOrder = right.sort_order;
		if (leftOrder !== null && leftOrder !== undefined) {
			if (rightOrder === null || rightOrder === undefined) return -1;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;
		} else if (rightOrder !== null && rightOrder !== undefined) {
			return 1;
		}
		return left.variant_name.localeCompare(right.variant_name, undefined, {
			sensitivity: 'base',
		});
	});
}

function renderDetails(element) {
	const detailsName = document.getElementById('detailsName');
	const status = document.getElementById('detailsStatus');
	detailsName.textContent = element.name;
	const content = document.getElementById('detailsContent');
	const numVariants = element.game_element_variants?.length ?? 0;
	status.textContent = `${numVariants} variant${numVariants !== 1 ? 's' : ''}`;
	for (const variant of sortAdminVariants(element.game_element_variants)) {
		const article = document.createElement('article');
		article.className = 'variant-detail';
		const detailsText = document.createElement('div');
		let variantName;
		if (variant.variant_name.toLowerCase() !== 'default') {
			variantName = document.createElement('h3');
			variantName.textContent = variant.variant_name;
		}
		const deleteButton = document.createElement('button');
		deleteButton.type = 'button';
		deleteButton.classList.add('delete-variant');
		deleteButton.innerHTML = `<i class="fa-solid fa-square-minus"></i> Delete Variant`;
		deleteButton.addEventListener('click', async () => {
			const confirmed = await modals.showConfirmation(
				'Confirm Deletion',
				`Delete the ${variant.variant_name} variant from ${element.name}?`,
			);
			if (!confirmed) return;
			try {
				modals.setConfirmBusy(true);
				await dataClient.deleteVariant(variant.id);
				await loadDetails({
					category: activeCategory,
					slug: element.slug,
				});
			} catch (error) {
				setStatus(
					document.getElementById('detailsStatus'),
					error.message,
				);
			} finally {
				modals.setConfirmBusy(false);
			}
		});
		const description = document.createElement('p');
		description.textContent = variant.variant_desc;
		detailsText.append(variantName, deleteButton, description);
		article.append(detailsText);
		if (variant.image) {
			const image = document.createElement('img');
			image.src = `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/${variant.image}`;
			image.alt = `${element.name}, ${variant.variant_name}`;
			article.prepend(image);
		}
		content.append(article);
	}
	return content;
}

function setStatus(element, message) {
	element.textContent = message;
}
