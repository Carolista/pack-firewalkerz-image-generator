import { getPublicImageUrl } from '../services/storageService.js';
import {
	getCatalogFilterOptions,
	isKnownFilterValue,
	matchesCatalogFilter,
} from './catalogFilter.js';

const BUTTON_ACTIONS = {
	details: { label: 'View Details', faClasses: 'fa-regular fa-eye' },
	edit: { label: 'Edit', faClasses: 'fa-solid fa-pen-to-square' },
	delete: { label: 'Delete', faClasses: 'fa-solid fa-trash-can' },
};

export function createCatalogView({
	categories,
	categoryTabs,
	categoryHeading,
	catalogStatus,
	elementList,
	addElementBtn,
	filterField,
	filterSelect,
	dataClient,
	storageService,
	modals,
	navigateTo,
	getActiveCategory,
	setActiveCategory,
	getActiveFilter,
	onStaleFilter,
}) {
	let loadToken = 0;
	filterSelect.addEventListener('change', () =>
		navigateTo({
			name: 'view',
			category: getActiveCategory(),
			subcategory: filterSelect.value,
		}),
	);
	const view = {
		renderTabs() {
			categoryTabs.replaceChildren();
			for (const category of Object.keys(categories)) {
				const button = document.createElement('button');
				button.type = 'button';
				button.className =
					category === getActiveCategory() ? 'tab active' : 'tab';
				const tabLabel = `View all ${categories[category].shortPlural}`;
				button.title = tabLabel;
				button.setAttribute('aria-label', tabLabel);
				const icon = document.createElement('i');
				icon.className = categories[category].faClasses;
				button.append(icon);
				if (category === getActiveCategory()) {
					const label = document.createElement('span');
					label.className = 'tab-label';
					label.textContent = ` ${categories[category].shortPlural}`;
					button.append(label);
				}
				button.addEventListener('click', () => {
					setActiveCategory(category);
					navigateTo({ name: 'view', category });
				});
				categoryTabs.append(button);
			}
			categoryHeading.textContent =
				categories[getActiveCategory()].longPlural;
		},
		async loadElements() {
			const category = getActiveCategory();
			const token = ++loadToken;
			setStatus(catalogStatus, 'Loading catalog...');
			elementList.replaceChildren();
			filterField.hidden = true;
			addElementBtn.innerHTML = `<i class="fa-solid fa-square-plus"></i> Add ${categories[category].shortSingular}`;
			addElementBtn.title = `Create a new ${categories[category].longSingular}`;
			try {
				const [elements, subcategories] = await Promise.all([
					dataClient.listElements(category),
					// The filter is optional, so a failure here must not hide the catalog.
					dataClient.listSubcategories(category).catch(() => null),
				]);
				if (token !== loadToken) return;

				const requestedFilter = getActiveFilter();
				const options = getCatalogFilterOptions(
					subcategories ?? [],
					elements,
					`All ${categories[category].shortPlural}`,
				);
				const filterIsStale =
					Boolean(subcategories) &&
					!isKnownFilterValue(requestedFilter, subcategories);
				const filter =
					options.length && !filterIsStale ? requestedFilter : '';
				if (filter !== requestedFilter) onStaleFilter();

				filterSelect.replaceChildren(
					...options.map(
						({ value, label }) => new Option(label, value),
					),
				);
				filterSelect.value = filter;
				filterField.hidden = !options.length;

				const visible = elements.filter(element =>
					matchesCatalogFilter(element, filter),
				);
				for (const element of visible)
					elementList.append(renderElement(element));
				const plural = categories[category].shortPlural;
				if (options.length) {
					// The filter's option labels already carry the counts.
					setStatus(
						catalogStatus,
						filterIsStale
							? 'The selected subcategory no longer exists, so all are shown.'
							: '',
					);
					return;
				}
				setStatus(
					catalogStatus,
					`${plural}: ${elements.length} result${elements.length !== 1 ? 's' : ''}`,
				);
			} catch (error) {
				if (token === loadToken)
					setStatus(catalogStatus, error.message);
			}
		},
	};
	return view;

	function renderElement(element) {
		const article = document.createElement('article');
		article.className = 'element-card';
		const variants = sortVariants(element.game_element_variants);
		const firstVariant = variants[0];
		const copy = document.createElement('div');
		copy.className = 'element-copy';
		const name = document.createElement('h3');
		name.textContent = element.name;
		copy.append(name);
		const subcategory = Array.isArray(element.game_element_subcategories)
			? element.game_element_subcategories[0]
			: element.game_element_subcategories;
		if (subcategory?.name) {
			const subcategorySummary = document.createElement('div');
			subcategorySummary.className = 'subcategory-summary';
			const subcategoryText = document.createElement('span');
			subcategoryText.className = 'subcategory-summary-text';
			subcategorySummary.append(subcategoryText);
			subcategoryText.textContent = subcategory.name;
			copy.append(subcategorySummary);
		}
		for (const [published, label] of [
			[true, 'published'],
			[false, 'unpublished'],
		]) {
			const names = variants
				.filter(variant => variant.is_published === published)
				.map(variant => variant.variant_name);
			const summary = document.createElement('p');
			if (!published) summary.className = 'unpublished-summary';
			summary.textContent = `${names.length} variant${names.length === 1 ? '' : 's'} ${label}${names.length ? `: ${names.join(', ')}` : ''}`;
			copy.append(summary);
		}
		const actions = document.createElement('div');
		actions.className = 'element-actions';
		for (const action of Object.keys(BUTTON_ACTIONS)) {
			const button = document.createElement('button');
			button.type = 'button';
			button.title = `${BUTTON_ACTIONS[action].label}: ${element.name}`;
			button.setAttribute('aria-label', button.title);
			button.innerHTML = `<i class="${BUTTON_ACTIONS[action].faClasses}"></i>`;
			if (action === 'delete') button.classList.add('delete');
			button.addEventListener('click', () => {
				if (action === 'delete') requestElementDeletion(element);
				else
					navigateTo({
						name: action,
						category: getActiveCategory(),
						slug: element.slug,
					});
			});
			actions.append(button);
		}
		article.append(copy, actions);
		if (firstVariant?.image) {
			const imageLink = document.createElement('a');
			imageLink.className = 'element-image-link';
			imageLink.href = `#/details/${getActiveCategory()}/${encodeURIComponent(element.slug)}`;
			imageLink.setAttribute(
				'aria-label',
				`View details for ${element.name}`,
			);
			const image = document.createElement('img');
			image.src = getPublicImageUrl(firstVariant.image);
			image.alt = `${element.name} reference image`;
			imageLink.append(image);
			article.prepend(imageLink);
		}
		return article;
	}

	async function requestElementDeletion(element) {
		const count = element.game_element_variants?.length ?? 0;
		const confirmed = await modals.showConfirmation(
			'Confirm Deletion',
			`Delete ${element.name} and its ${count} variant${count !== 1 ? 's' : ''}?`,
		);
		if (!confirmed) return;
		setStatus(catalogStatus, 'Deleting...');
		try {
			const imagePaths = (element.game_element_variants ?? [])
				.map(variant => variant.image)
				.filter(Boolean);
			if (imagePaths.length)
				await storageService.deleteImages(imagePaths);
			await dataClient.deleteElement(element.id);
			await view.loadElements();
		} catch (error) {
			setStatus(catalogStatus, error.message);
		}
	}
}

function sortVariants(variants = []) {
	return [...variants].sort(
		(left, right) =>
			(left.sort_order ?? Infinity) - (right.sort_order ?? Infinity) ||
			left.variant_name.localeCompare(right.variant_name),
	);
}

function setStatus(element, message) {
	element.textContent = message;
}
