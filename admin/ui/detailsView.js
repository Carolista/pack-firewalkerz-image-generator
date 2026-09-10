import { getPublicImageUrl } from '../services/storageService.js';

export function createDetailsView({
	container,
	content,
	status,
	dataClient,
	storageService,
	modals,
}) {
	const view = {
		async load(route) {
			container.hidden = false;
			content.replaceChildren();
			setStatus(status, '');
			try {
				const [element] = await dataClient.getElementBySlug(route.slug);
				if (!element) throw new Error('Element not found.');
				content.append(renderElement(element));
			} catch (error) {
				setStatus(status, error.message);
			}
		},
	};

	function renderElement(element) {
		const detailsName = document.getElementById('detailsName');
		const detailsStatus = document.getElementById('detailsStatus');
		detailsName.textContent = element.name;
		const variantCount = element.game_element_variants?.length ?? 0;
		detailsStatus.textContent = `${variantCount} variant${variantCount !== 1 ? 's' : ''}`;
		const wrapper = document.createElement('div');
		for (const variant of sortVariants(element.game_element_variants)) {
			const article = document.createElement('article');
			article.className = 'variant-detail';
			const text = document.createElement('div');
			if (variant.variant_name.toLowerCase() !== 'default') {
				const heading = document.createElement('h3');
				heading.textContent = variant.variant_name;
				text.append(heading);
			}
			const description = document.createElement('p');
			description.textContent = variant.variant_desc;
			text.append(description);
			const deleteButton = document.createElement('button');
			deleteButton.type = 'button';
			deleteButton.className = 'delete-variant';
			deleteButton.innerHTML =
				'<i class="fa-solid fa-square-minus"></i> Delete Variant';
			deleteButton.addEventListener('click', () =>
				deleteVariant(element, variant),
			);
			text.append(deleteButton);
			article.append(text);
			if (variant.image) {
				const image = document.createElement('img');
				image.src = getPublicImageUrl(variant.image);
				image.alt = `${element.name}, ${variant.variant_name}`;
				article.prepend(image);
			}
			wrapper.append(article);
		}
		return wrapper;
	}

	async function deleteVariant(element, variant) {
		const confirmed = await modals.showConfirmation(
			'Confirm Deletion',
			`Delete the ${variant.variant_name} variant from ${element.name}?`,
		);
		if (!confirmed) return;
		try {
			modals.setConfirmBusy(true);
			await dataClient.deleteVariant(variant.id);
			if (variant.image) await storageService.deleteImage(variant.image);
			await view.load({ slug: element.slug });
		} catch (error) {
			setStatus(status, error.message);
		} finally {
			modals.setConfirmBusy(false);
		}
	}

	return view;
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
