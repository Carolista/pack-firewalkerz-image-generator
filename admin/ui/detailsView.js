import {
	canShareFile,
	createShareFile,
	fetchShareBlob,
	shareFile,
	supportsImageSharing,
} from '../../src/services/share.js';
import { setPendingVariantId } from '../services/pendingScroll.js';
import { getPublicImageUrl } from '../services/storageService.js';

export function createDetailsView({
	container,
	content,
	status,
	dataClient,
	storageService,
	modals,
	navigateTo,
}) {
	const detailsName = document.getElementById('details-name');
	const detailsStatus = document.getElementById('details-status');

	const view = {
		async load(route) {
			container.hidden = false;
			clearHeader();
			setStatus(status, '');
			showLoading();
			try {
				const [element] = await dataClient.getElementBySlug(route.slug);
				if (!element) throw new Error('Element not found.');
				content.replaceChildren(renderElement(element));
			} catch (error) {
				clearHeader();
				content.replaceChildren();
				setStatus(status, error.message);
			}
		},
	};

	function clearHeader() {
		detailsName.textContent = '';
		detailsStatus.textContent = '';
	}

	function showLoading() {
		// Hold the outgoing content height so swapping elements does not collapse the panel.
		const previousHeight = content.offsetHeight;
		const wrapper = document.createElement('div');
		wrapper.className = 'details-loading';
		if (previousHeight > 0) wrapper.style.minHeight = `${previousHeight}px`;
		const spinner = document.createElement('span');
		spinner.className = 'image-spinner admin-image-spinner';
		spinner.setAttribute('role', 'status');
		spinner.setAttribute('aria-label', 'Loading element');
		wrapper.append(spinner);
		content.replaceChildren(wrapper);
	}

	function renderElement(element) {
		detailsName.textContent = element.name;
		const variantCount = element.game_element_variants?.length ?? 0;
		detailsStatus.textContent = `${variantCount} variant${variantCount !== 1 ? 's' : ''}`;
		const wrapper = document.createElement('div');
		for (const variant of sortVariants(element.game_element_variants)) {
			const article = document.createElement('article');
			article.className = 'variant-detail';
			const text = document.createElement('div');
			const heading = document.createElement('h3');
			heading.textContent = variant.variant_name;
			text.append(heading);
			if (!variant.is_published) {
				const publication = document.createElement('span');
				publication.className = 'unpublished-label';
				publication.textContent = 'Unpublished';
				text.append(publication);
			}
			const description = document.createElement('p');
			description.textContent = variant.variant_desc;
			text.append(description);
			const actions = document.createElement('div');
			actions.className = 'variant-detail-actions';
			if (variant.image && supportsImageSharing()) {
				const shareButton = document.createElement('button');
				shareButton.type = 'button';
				shareButton.className = 'share-variant';
				shareButton.innerHTML =
					'<i class="fa-solid fa-share-from-square" aria-hidden="true"></i> Share Image';
				shareButton.addEventListener('click', () =>
					shareVariantImage(element, variant),
				);
				actions.append(shareButton);
			}
			const editButton = document.createElement('button');
			editButton.type = 'button';
			editButton.className = 'edit-variant';
			editButton.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
			editButton.addEventListener('click', () => {
				setPendingVariantId(variant.id);
				navigateTo({
					name: 'edit',
					category: element.element_type,
					slug: element.slug,
				});
			});
			const deleteButton = document.createElement('button');
			deleteButton.type = 'button';
			deleteButton.className = 'delete-variant';
			deleteButton.innerHTML =
				'<i class="fa-solid fa-square-minus"></i> Delete';
			deleteButton.addEventListener('click', () =>
				deleteVariant(element, variant),
			);
			actions.append(editButton, deleteButton);
			text.append(actions);
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

	async function shareVariantImage(element, variant) {
		try {
			const blob = await fetchShareBlob(getPublicImageUrl(variant.image));
			const file = createShareFile(
				blob,
				variant.image
					.split('/')
					.pop()
					.replace(/\.[^.]+$/, ''),
			);
			if (!canShareFile(file)) return;
			await shareFile(file, {
				title: element.name,
				text: variant.variant_name,
			});
		} catch (error) {
			setStatus(status, error.message);
		}
	}

	async function deleteVariant(element, variant) {
		const confirmed = await modals.showConfirmation(
			'Confirm Deletion',
			`Delete the ${variant.variant_name} variant from ${element.name}?`,
		);
		if (!confirmed) return;
		try {
			modals.setConfirmBusy(true);
			if (variant.image) await storageService.deleteImage(variant.image);
			await dataClient.deleteVariant(variant.id);
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
