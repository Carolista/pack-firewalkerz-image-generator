import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../supabaseConfig.js';
import { createAdminDataClient } from './adminData.js';

const CATEGORIES = [
	{ key: 'character', label: 'Player Characters' },
	{ key: 'npc', label: 'NPCs' },
	{ key: 'enemy', label: 'Enemies' },
	{ key: 'location', label: 'Locations' },
];

const SESSION_KEY = 'packFirewalkerzAdminSession';
let session = readSession();
let activeCategory = 'character';
const dataClient = createAdminDataClient(() => session);

const loginPanel = document.getElementById('loginPanel');
const catalogPanel = document.getElementById('catalogPanel');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const catalogStatus = document.getElementById('catalogStatus');
const categoryHeading = document.getElementById('categoryHeading');
const categoryTabs = document.getElementById('categoryTabs');
const elementList = document.getElementById('elementList');
const signOutBtn = document.getElementById('signOutBtn');
document.getElementById('addElementBtn').disabled = true;

loginForm.addEventListener('submit', signIn);
signOutBtn.addEventListener('click', signOut);

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
			headers: authHeaders(),
		}).catch(() => {});
	}
	localStorage.removeItem(SESSION_KEY);
	session = null;
	renderShell();
}

async function renderShell() {
	const authenticated = Boolean(session?.access_token);
	loginPanel.hidden = authenticated;
	catalogPanel.hidden = !authenticated;
	signOutBtn.hidden = !authenticated;
	if (!authenticated) return;
	renderTabs();
	await loadElements();
}

function renderTabs() {
	categoryTabs.replaceChildren();
	for (const category of CATEGORIES) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className =
			category.key === activeCategory ? 'tab active' : 'tab';
		button.textContent = category.label;
		button.addEventListener('click', async () => {
			activeCategory = category.key;
			renderTabs();
			await loadElements();
		});
		categoryTabs.append(button);
	}
	categoryHeading.textContent = getCategory().label;
}

async function loadElements() {
	setStatus(catalogStatus, 'Loading catalog...');
	elementList.replaceChildren();
	try {
		const elements = await dataClient.listElements(activeCategory);
		for (const element of elements)
			elementList.append(renderElement(element));
		setStatus(catalogStatus, `${elements.length} elements`);
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
	const slug = document.createElement('p');
	slug.className = 'eyebrow';
	slug.textContent = element.slug;
	const name = document.createElement('h3');
	name.textContent = element.name;
	const count = document.createElement('p');
	count.textContent = `${element.game_element_variants?.length ?? 0} variant(s)`;
	copy.append(slug, name, count);
	const actions = document.createElement('div');
	actions.className = 'element-actions';
	for (const label of ['Edit', 'Details']) {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = label;
		button.addEventListener('click', () => {
			setStatus(
				catalogStatus,
				`${label} view for ${element.name} is the next admin slice.`,
			);
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

function getCategory() {
	return CATEGORIES.find(category => category.key === activeCategory);
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
