import { SUPABASE_URL } from '../src/services/supabaseConfig.js';

export function createFormView({
	formContainer,
	formHeading,
	elementForm,
	formCategory,
	formName,
	formSlug,
	formStatus,
	variantFormRows,
	addVariantBtn,
	dataClient,
	modals,
	navigateTo,
	categories,
	getRoute,
}) {
	let elementId = null;
	let deletedVariantIds = [];
	let initialSnapshot = '';

	addVariantBtn.addEventListener('click', () =>
		addVariantFormRow({}, { scrollIntoView: true }),
	);
	elementForm.addEventListener('submit', save);

	return {
		isVisible() {
			return !formContainer.hidden;
		},
		async load(route) {
			formContainer.hidden = false;
			formHeading.textContent =
				route.name === 'add' ? 'Add new element' : 'Edit';
			formCategory.replaceChildren();
			for (const category of Object.keys(categories)) {
				formCategory.add(
					new Option(categories[category].shortPlural, category),
				);
			}
			formCategory.value = route.category;
			formCategory.disabled = route.name === 'edit';
			variantFormRows.replaceChildren();
			elementId = null;
			deletedVariantIds = [];
			try {
				if (route.name === 'add') {
					formName.value = '';
					formSlug.value = '';
					addVariantFormRow();
					setInitialSnapshot();
					return;
				}
				const [element] = await dataClient.getElementBySlug(route.slug);
				if (!element) throw new Error('Element not found.');
				formHeading.textContent += ` ${element.name}`;
				elementId = element.id;
				formName.value = element.name;
				formSlug.value = element.slug;
				for (const variant of sortVariants(
					element.game_element_variants,
				))
					addVariantFormRow(variant);
				setInitialSnapshot();
			} catch (error) {
				setStatus(formStatus, error.message);
			}
		},
		async requestNavigation() {
			if (initialSnapshot && getSnapshot() !== initialSnapshot) {
				const confirmed = await modals.showConfirmation(
					'Unsaved changes',
					'Leave this form and discard your changes?',
					{ cancelLabel: 'Stay', confirmLabel: 'Discard Changes' },
				);
				if (!confirmed) return;
			}
			navigateTo({ name: 'view', category: formCategory.value });
		},
	};

	function addVariantFormRow(variant = {}, { scrollIntoView = false } = {}) {
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
			<div class="variant-image-field"><label>Image Path<input class="variant-image" value="${variant.image ?? ''}" /></label><div class="admin-image-preview" aria-label="Image preview"></div></div>
			<button class="delete-variant" type="button"><i class="fa-solid fa-square-minus"></i> Delete variant</button>
		`;
		row.querySelector('.delete-variant').addEventListener(
			'click',
			async () => {
				if (row.dataset.variantId) {
					const confirmed = await modals.showConfirmation(
						'Confirm Deletion',
						`Delete the ${row.querySelector('.variant-name').value} variant?`,
					);
					if (!confirmed) return;
					deletedVariantIds.push(row.dataset.variantId);
				}
				row.remove();
			},
		);
		variantFormRows.append(row);
		if (scrollIntoView) {
			row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
		const description = row.querySelector('.variant-desc');
		const resize = () => {
			description.style.height = 'auto';
			description.style.height = `${description.scrollHeight}px`;
		};
		description.addEventListener('input', resize);
		resize();
		const imageInput = row.querySelector('.variant-image');
		const imagePreview = row.querySelector('.admin-image-preview');
		const updatePreview = () => {
			imagePreview.replaceChildren();
			if (!imageInput.value.trim()) return;
			const image = document.createElement('img');
			image.src = imageInput.value.startsWith('http')
				? imageInput.value
				: `${SUPABASE_URL}/storage/v1/object/public/rpg-generator-reference-images/${imageInput.value}`;
			image.alt = 'Variant preview';
			imagePreview.append(image);
		};
		imageInput.addEventListener('input', updatePreview);
		updatePreview();
	}

	async function save(event) {
		event.preventDefault();
		setStatus(formStatus, 'Saving...');
		const route = getRoute();
		const rows = [...variantFormRows.querySelectorAll('.variant-form-row')];
		if (!rows.length)
			return setStatus(formStatus, 'Add at least one variant.');
		const names = rows.map(row =>
			row.querySelector('.variant-name').value.trim(),
		);
		if (names.some(name => !name))
			return setStatus(formStatus, 'Every variant needs a name.');
		if (
			new Set(names.map(name => name.toLowerCase())).size !== names.length
		)
			return setStatus(formStatus, 'Variant names must be unique.');
		if (
			rows.length > 1 &&
			names.some(name => name.toLowerCase() === 'default')
		)
			return setStatus(
				formStatus,
				'When an element has multiple variants, none can be named "default". Please rename variants to descriptive names.',
			);
		try {
			if (route.name === 'add') {
				const [created] = await dataClient.createElement({
					element_type: formCategory.value,
					name: formName.value.trim(),
					slug: formSlug.value.trim(),
				});
				elementId = created.id;
			} else if (elementId)
				await dataClient.updateElement(elementId, {
					element_type: formCategory.value,
					name: formName.value.trim(),
					slug: formSlug.value.trim(),
				});
			else
				throw new Error(
					'The element could not be identified for editing.',
				);
			for (const row of rows) {
				const payload = {
					element_id: elementId,
					variant_name: row
						.querySelector('.variant-name')
						.value.trim(),
					variant_desc: row
						.querySelector('.variant-desc')
						.value.trim(),
					sort_order:
						Number(row.querySelector('.variant-sort').value) ||
						null,
					image: row.querySelector('.variant-image').value.trim(),
				};
				const id = row.dataset.variantId;
				if (id) await dataClient.updateVariant(id, payload);
				else await dataClient.createVariant(payload);
			}
			for (const id of deletedVariantIds)
				await dataClient.deleteVariant(id);
			setStatus(formStatus, '');
			navigateTo({ name: 'view', category: formCategory.value });
		} catch (error) {
			setStatus(formStatus, error.message);
		}
	}

	function getSnapshot() {
		return JSON.stringify({
			category: formCategory.value,
			name: formName.value,
			slug: formSlug.value,
			variants: [
				...variantFormRows.querySelectorAll('.variant-form-row'),
			].map(row => ({
				id: row.dataset.variantId,
				name: row.querySelector('.variant-name').value,
				description: row.querySelector('.variant-desc').value,
				sortOrder: row.querySelector('.variant-sort').value,
				image: row.querySelector('.variant-image').value,
			})),
		});
	}

	function setInitialSnapshot() {
		initialSnapshot = getSnapshot();
	}

	function sortVariants(variants = []) {
		return [...variants].sort(
			(left, right) =>
				(left.sort_order ?? Infinity) -
					(right.sort_order ?? Infinity) ||
				left.variant_name.localeCompare(right.variant_name),
		);
	}

	function setStatus(element, message) {
		element.textContent = message;
	}
}
