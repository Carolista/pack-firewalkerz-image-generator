import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from '../src/services/supabaseConfig.js';
import { createAdminDataClient } from './adminData.js';

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

const BUTTON_ACTIONS = [
	{
		key: 'details',
		label: 'View Details',
		faClasses: 'fa-regular fa-eye',
	},
	{
		key: 'edit',
		label: 'Edit',
		faClasses: 'fa-solid fa-pen-to-square',
	},
	{
		key: 'delete',
		label: 'Delete',
		faClasses: 'fa-solid fa-trash-can',
	},
];

const SESSION_KEY = 'packFirewalkerzAdminSession';
let session = readSession();
let activeCategory = 'character';
let formElementId = null;
const dataClient = createAdminDataClient(() => session);

const loginPanel = document.getElementById('loginPanel');
const catalogPanel = document.getElementById('catalogPanel');
const detailsPanel = document.getElementById('detailsPanel');
const detailsContent = document.getElementById('detailsContent');
const detailsBackBtn = document.getElementById('detailsBackBtn');
const formPanel = document.getElementById('formPanel');
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

loginForm.addEventListener('submit', signIn);
signOutBtn.addEventListener('click', signOut);
addElementBtn.addEventListener('click', () => {
	window.location.hash = `#/add/${activeCategory}`;
});
elementForm.addEventListener('submit', saveElement);
document.getElementById('addVariantBtn').addEventListener('click', () => {
	addVariantFormRow();
});
detailsBackBtn.addEventListener('click', () => {
	window.location.hash = `#/view/${activeCategory}`;
});
document.getElementById('formBackBtn').addEventListener('click', () => {
	window.location.hash = `#/view/${activeCategory}`;
});
window.addEventListener('hashchange', renderShell);

renderShell();

async function signIn(event) {
	event.preventDefault();
	setStatus(loginStatus, 'Signing in...');
	try {
		const response = await fetch(
			`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
			{
				method: 'POST',
				headers: {
					apikey: SUPABASE_PUBLISHABLE_KEY,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: document.getElementById('emailInput').value,
					password: document.getElementById('passwordInput').value,
				}),
			},
		);
		const data = await response.json();
		if (!response.ok)
			throw new Error(
				data.error_description ?? data.msg ?? 'Sign-in failed.',
			);
		session = data;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
		await renderShell();
	} catch (error) {
		setStatus(loginStatus, error.message);
	}
}

async function signOut() {
	if (session?.access_token) {
		await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
			method: 'POST',
			headers: {
				apikey: SUPABASE_PUBLISHABLE_KEY,
				Authorization: `Bearer ${session.access_token}`,
			},
		}).catch(() => {});
	}
	localStorage.removeItem(SESSION_KEY);
	session = null;
	renderShell();
}

async function renderShell() {
	const authenticated = Boolean(session?.access_token);
	loginPanel.hidden = authenticated;
	const detailsRoute = getDetailsRoute();
	const formRoute = getFormRoute();
	catalogPanel.hidden = !authenticated || Boolean(detailsRoute || formRoute);
	detailsPanel.hidden = !authenticated || !detailsRoute;
	formPanel.hidden = !authenticated || !formRoute;
	signOutBtn.hidden = !authenticated;
	if (!authenticated) return;
	renderTabs();
	if (detailsRoute) await loadDetails(detailsRoute);
	else if (formRoute) await loadForm(formRoute);
	else await loadElements();
}

function renderTabs() {
	categoryTabs.replaceChildren();
	for (const category of Object.keys(CATEGORIES)) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = category === activeCategory ? 'tab active' : 'tab';
		button.title = `View all ${CATEGORIES[category].shortPlural}`;
		const icon = `<i class="${CATEGORIES[category].faClasses}"></i>`;
		button.innerHTML =
			category === activeCategory
				? `${icon} ${CATEGORIES[category].shortPlural}`
				: icon;
		button.addEventListener('click', async () => {
			activeCategory = category;
			window.location.hash = `#/view/${category}`;
		});
		categoryTabs.append(button);
	}
}

async function loadElements() {
	setStatus(catalogStatus, 'Loading catalog...');
	elementList.replaceChildren();
	try {
		addElementBtn.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Add ${CATEGORIES[activeCategory].longSingular}`;
        addElementBtn.title = `Create a new ${CATEGORIES[activeCategory].longSingular}`
		const elements = await dataClient.listElements(activeCategory);
		for (const element of elements)
			elementList.append(renderElement(element));
		const numResults = elements.length;
		setStatus(
			catalogStatus,
			`${CATEGORIES[activeCategory].longPlural}: ${numResults} result${numResults !== 1 ? 's' : ''}`,
		);
	} catch (error) {
		setStatus(catalogStatus, error.message);
	}
}

function renderElement(element) {
	const article = document.createElement('article');
	article.className = 'element-card';
	const firstVariant = element.game_element_variants?.[0];
	const copy = document.createElement('div');
	copy.className = 'element-copy';
	const name = document.createElement('h3');
	name.textContent = element.name;
	const count = document.createElement('p');
	const numVariants = element.game_element_variants?.length ?? 0;
	count.textContent = `${numVariants} variant${numVariants !== 1 ? 's' : ''}`;
	copy.append(name, count);
	const actions = document.createElement('div');
	actions.className = 'element-actions';
	for (const action of BUTTON_ACTIONS) {
		const button = document.createElement('button');
		button.type = 'button';
		button.title = `${action.label}: ${element.name}`;
		button.innerHTML = `<i class="${action.faClasses}"></i>`;
		button.addEventListener('click', () => {
			if (action.key === 'details') {
				window.location.hash = `#/details/${activeCategory}/${encodeURIComponent(element.slug)}`;
				return;
			} else if (action.key === 'edit') {
				window.location.hash = `#/edit/${activeCategory}/${encodeURIComponent(element.slug)}`;
			} else if (action.key === 'delete') {
				// TODO: set path with slug for delete
			}
		});
		actions.append(button);
	}
	article.append(copy, actions);
	if (firstVariant?.image) {
		const image = document.createElement('img');
		image.src = `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/${firstVariant.image}`;
		image.alt = `${element.name} reference`;
		article.prepend(image);
	}
	return article;
}

function getDetailsRoute() {
	const parts = window.location.hash.split('/');
	if (parts[1] !== 'details' || !parts[3]) {
		return null;
	}
	return { category: parts[2], slug: decodeURIComponent(parts[3]) };
}

function getFormRoute() {
	const parts = window.location.hash.split('/');
	if (parts[1] === 'add' && parts[2]) {
		return { mode: 'add', category: parts[2] };
	}
	if (parts[1] === 'edit' && parts[2] && parts[3]) {
		return {
			mode: 'edit',
			category: parts[2],
			slug: decodeURIComponent(parts[3]),
		};
	}
	return null;
}

async function loadForm(route) {
	activeCategory = route.category;
	formHeading.textContent =
		route.mode === 'add' ? 'Add element' : 'Edit element';
	formCategory.replaceChildren();
	for (const category of Object.keys(CATEGORIES)) {
		formCategory.add(
			new Option(CATEGORIES[category].shortPlural, category),
		);
	}
	formCategory.value = route.category;
	formCategory.disabled = route.mode === 'edit';
	variantFormRows.replaceChildren();
	formElementId = null;
	try {
		if (route.mode === 'add') {
			formName.value = '';
			formSlug.value = '';
			addVariantFormRow();
			return;
		}
		const [element] = await dataClient.getElementBySlug(route.slug);
		if (!element) throw new Error('Element not found.');
		formElementId = element.id;
		formName.value = element.name;
		formSlug.value = element.slug;
		for (const variant of sortAdminVariants(
			element.game_element_variants,
		)) {
			addVariantFormRow(variant);
		}
	} catch (error) {
		setStatus(formStatus, error.message);
	}
}

function addVariantFormRow(variant = {}) {
	const row = document.createElement('div');
	row.className = 'variant-form-row';
	row.dataset.variantId = variant.id ?? '';
	const existingNames = new Set(
		[...variantFormRows.querySelectorAll('.variant-name')].map(input =>
			input.value.trim().toLowerCase(),
		),
	);
	let defaultName = variant.variant_name;
	if (!defaultName) {
		defaultName = existingNames.size
			? `Variant ${existingNames.size + 1}`
			: 'default';
		while (existingNames.has(defaultName.toLowerCase())) {
			defaultName = `Variant ${existingNames.size + 2}`;
		}
	}
	row.innerHTML = `
		<label class="variant-name-field">Variant Name *<input class="variant-name" required value="${defaultName}" /></label>
		<label class="variant-sort-field">Sort Order<input class="variant-sort" type="number" min="1" value="${variant.sort_order ?? ''}" /></label>
		<label class="variant-desc-field">Description *<textarea class="variant-desc" required>${variant.variant_desc ?? ''}</textarea></label>
		<div class="variant-image-field">
			<label>Image Path<input class="variant-image" value="${variant.image ?? ''}" /></label>
			<div class="admin-image-preview" aria-label="Image preview"></div>
		</div>
		<button class="remove-variant" type="button">Remove variant</button>
	`;
	row.querySelector('.remove-variant').addEventListener('click', () =>
		row.remove(),
	);
	variantFormRows.append(row);
	const description = row.querySelector('.variant-desc');
	const resizeDescription = () => {
		description.style.height = 'auto';
		description.style.height = `${description.scrollHeight}px`;
	};
	description.addEventListener('input', resizeDescription);
	resizeDescription();
	const imageInput = row.querySelector('.variant-image');
	const imagePreview = row.querySelector('.admin-image-preview');
	const updateImagePreview = () => {
		imagePreview.replaceChildren();
		if (!imageInput.value.trim()) return;
		const image = document.createElement('img');
		image.src = imageInput.value.startsWith('http')
			? imageInput.value
			: `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/${imageInput.value}`;
		image.alt = 'Variant preview';
		imagePreview.append(image);
	};
	imageInput.addEventListener('input', updateImagePreview);
	updateImagePreview();
}

async function saveElement(event) {
	event.preventDefault();
	setStatus(formStatus, 'Saving...');
	const route = getFormRoute();
	const elementPayload = {
		element_type: formCategory.value,
		name: formName.value.trim(),
		slug: formSlug.value.trim(),
	};
	const rows = [...variantFormRows.querySelectorAll('.variant-form-row')];
	if (!rows.length) {
		setStatus(formStatus, 'Add at least one variant.');
		return;
	}
	const variantNames = rows.map(row =>
		row.querySelector('.variant-name').value.trim(),
	);
	if (variantNames.some(name => !name)) {
		setStatus(formStatus, 'Every variant needs a name.');
		return;
	}
	const duplicateNames = variantNames.filter(
		(name, index) =>
			variantNames.findIndex(
				candidate => candidate.toLowerCase() === name.toLowerCase(),
			) !== index,
	);
	if (duplicateNames.length) {
		setStatus(formStatus, 'Variant names must be unique.');
		return;
	}
	try {
		let elementId = formElementId;
		if (route.mode === 'add') {
			const [created] = await dataClient.createElement(elementPayload);
			elementId = created.id;
		} else if (elementId) {
			await dataClient.updateElement(elementId, elementPayload);
		} else {
			throw new Error('The element could not be identified for editing.');
		}
		for (const row of rows) {
			const payload = {
				element_id: elementId,
				variant_name: row.querySelector('.variant-name').value.trim(),
				variant_desc: row.querySelector('.variant-desc').value.trim(),
				sort_order:
					Number(row.querySelector('.variant-sort').value) || null,
				image: row.querySelector('.variant-image').value.trim(),
			};
			const variantId = row.dataset.variantId;
			if (variantId) await dataClient.updateVariant(variantId, payload);
			else await dataClient.createVariant(payload);
		}
		window.location.hash = `#/view/${formCategory.value}`;
	} catch (error) {
		setStatus(formStatus, error.message);
	}
}

async function loadDetails(route) {
	catalogPanel.hidden = true;
	detailsPanel.hidden = false;
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
	const content = document.createElement('div');
	const heading = document.createElement('h2');
	const status = document.getElementById('detailsStatus');
	heading.textContent = element.name;
	content.append(heading);
	const numVariants = element.game_element_variants?.length ?? 0;
	status.textContent = `${numVariants} variant${numVariants !== 1 ? 's' : ''}`;
	for (const variant of sortAdminVariants(element.game_element_variants)) {
		const article = document.createElement('article');
		article.className = 'variant-detail';
		if (variant.variant_name.toLowerCase() !== 'default') {
			const name = document.createElement('h3');
			name.textContent = variant.variant_name;
		}
		const description = document.createElement('p');
		description.textContent = variant.variant_desc;
		article.append(name, description);
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

function getCategory() {
	return CATEGORIES[activeCategory];
}

function readSession() {
	try {
		return JSON.parse(localStorage.getItem(SESSION_KEY));
	} catch {
		return null;
	}
}

function setStatus(element, message) {
	element.textContent = message;
}
