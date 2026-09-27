import { resolveReferenceImageUrl } from '../services/api.js';
import {
	canShareFile,
	createShareFile,
	fetchShareBlob,
	shareFile,
	supportsImageSharing,
} from '../services/share.js';
import { focusFirst, trapFocus } from './focusTrap.js';

let overlayEl;
let modalEl;
let headingEl;
let gridEl;
let previouslyFocusedEl;
let releaseFocusTrap;

export function initCatalogPreviewModal({ overlay, closeBtn, heading, grid }) {
	overlayEl = overlay;
	modalEl = overlay.querySelector('.modal') ?? overlay;
	headingEl = heading;
	gridEl = grid;

	const dismiss = () => {
		document.body.classList.remove('modal-open');
		overlayEl.hidden = true;
		releaseFocusTrap?.();
		releaseFocusTrap = null;
		previouslyFocusedEl?.focus();
		previouslyFocusedEl = null;
	};

	closeBtn.addEventListener('click', dismiss);
	overlayEl.addEventListener('click', event => {
		if (event.target === overlayEl) dismiss();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !overlayEl.hidden) dismiss();
	});
}

export function showCatalogPreview(element, trigger = document.activeElement) {
	if (!element?.variants?.length) return;

	headingEl.textContent = element.name;
	gridEl.replaceChildren(
		...element.variants.map(variant => createVariantTile(element, variant)),
	);
	previouslyFocusedEl = trigger;
	document.body.classList.add('modal-open');
	overlayEl.hidden = false;
	releaseFocusTrap = trapFocus(modalEl);
	focusFirst(modalEl);
}

function createVariantTile(element, variant) {
	const figure = document.createElement('figure');
	figure.className = 'catalog-preview-tile';

	const imageBox = document.createElement('div');
	imageBox.className = 'catalog-preview-image';
	if (variant.image) {
		const image = document.createElement('img');
		image.src = resolveReferenceImageUrl(variant.image);
		image.alt = `${element.name}, ${variant.variantName} reference`;
		image.addEventListener('error', () => image.remove());
		imageBox.append(image);
	}

	const captionRow = document.createElement('div');
	captionRow.className = 'catalog-preview-caption';

	const caption = document.createElement('figcaption');
	caption.textContent = variant.variantName;
	captionRow.append(caption);

	if (variant.image && supportsImageSharing()) {
		const shareButton = document.createElement('button');
		shareButton.type = 'button';
		shareButton.className = 'catalog-preview-share';
		shareButton.innerHTML =
			'<i class="fa-solid fa-share-from-square" aria-hidden="true"></i>';
		shareButton.setAttribute(
			'aria-label',
			`Share ${element.name}, ${variant.variantName}`,
		);
		shareButton.addEventListener('click', () =>
			shareVariantImage(element, variant),
		);
		captionRow.append(shareButton);
	}

	figure.append(imageBox, captionRow);
	return figure;
}

async function shareVariantImage(element, variant) {
	try {
		const blob = await fetchShareBlob(
			resolveReferenceImageUrl(variant.image),
		);
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
			text: variant.variantName,
		});
	} catch (error) {
		console.error('Could not share the image:', error);
	}
}
