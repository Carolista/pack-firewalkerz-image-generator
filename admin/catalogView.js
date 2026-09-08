import { SUPABASE_URL } from '../src/services/supabaseConfig.js';

const BUTTON_ACTIONS = [
	{ key: 'details', label: 'View Details', faClasses: 'fa-regular fa-eye' },
	{ key: 'edit', label: 'Edit', faClasses: 'fa-solid fa-pen-to-square' },
	{ key: 'delete', label: 'Delete', faClasses: 'fa-solid fa-trash-can' },
];

export function createCatalogView({
	categories,
	categoryTabs,
	categoryHeading,
	catalogStatus,
	elementList,
	addElementBtn,
	dataClient,
	modals,
	navigateTo,
	getActiveCategory,
	setActiveCategory,
}) {
	const view = {
		renderTabs() {
			categoryTabs.replaceChildren();
			for (const category of Object.keys(categories)) {
				const button = document.createElement('button');
				button.type = 'button';
				button.className =
					category === getActiveCategory() ? 'tab active' : 'tab';
				button.title = `View all ${categories[category].shortPlural}`;
				const icon = document.createElement('i');
				icon.className = categories[category].faClasses;
				button.append(icon, ` ${categories[category].shortPlural}`);
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
			setStatus(catalogStatus, 'Loading catalog...');
			elementList.replaceChildren();
			addElementBtn.innerHTML = `<i class="fa-solid fa-square-plus"></i> Add ${categories[category].longSingular}`;
			addElementBtn.title = `Create a new ${categories[category].longSingular}`;
			try {
				const elements = await dataClient.listElements(category);
				for (const element of elements)
					elementList.append(renderElement(element));
				setStatus(
					catalogStatus,
					`${categories[category].longPlural}: ${elements.length} result${elements.length !== 1 ? 's' : ''}`,
				);
			} catch (error) {
				setStatus(catalogStatus, error.message);
			}
		},
	};
	return view;

	function renderElement(element) {
		const article = document.createElement('article');
		article.className = 'element-card';
		const firstVariant = sortVariants(element.game_element_variants)[0];
		const copy = document.createElement('div');
		copy.className = 'element-copy';
		const name = document.createElement('h3');
		name.textContent = element.name;
		const count = document.createElement('p');
		const variantCount = element.game_element_variants?.length ?? 0;
		if (variantCount > 1) {
			const variantList = sortVariants(element.game_element_variants)
				.map(variant => variant.variant_name)
				.join(', ');
			count.textContent = `${variantCount} variants: ${variantList}`;
		}
		copy.append(name, count);
		const actions = document.createElement('div');
		actions.className = 'element-actions';
		for (const action of BUTTON_ACTIONS) {
			const button = document.createElement('button');
			button.type = 'button';
			button.title = `${action.label}: ${element.name}`;
			button.innerHTML = `<i class="${action.faClasses}"></i>`;
			button.addEventListener('click', () => {
				if (action.key === 'delete') requestElementDeletion(element);
				else
					navigateTo({
						name: action.key,
						category: getActiveCategory(),
						slug: element.slug,
					});
			});
			actions.append(button);
		}
		article.append(copy, actions);
		if (firstVariant?.image) {
			const image = document.createElement('img');
			image.src = `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/${firstVariant.image}`;
			image.alt = `${element.name} reference image`;
			article.prepend(image);
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
