import { resolveReferenceImageUrl } from '../services/api.js';
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

	const caption = document.createElement('figcaption');
	caption.textContent = variant.variantName;
	figure.append(imageBox, caption);
	return figure;
}
