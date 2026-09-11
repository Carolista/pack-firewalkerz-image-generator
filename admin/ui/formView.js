import {
	NEUTRAL_VOID_SLUG,
	buildReferenceImagePrompt,
} from '../../src/prompt.js';
import {
	generateImageWithNetworkRetry,
	loadReferenceImages,
} from '../../src/services/api.js';
import {
	CATEGORY_FOLDERS,
	getPublicImageUrl,
} from '../services/storageService.js';

function slugify(text) {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function extensionFromMime(mimeType) {
	if (mimeType === 'image/png') return 'png';
	if (mimeType === 'image/webp') return 'webp';
	return 'jpg';
}

function parseImagePath(imagePath, folderPrefix) {
	if (!imagePath || imagePath.startsWith('http')) {
		return { base: '', ext: 'jpg' };
	}
	const relative = imagePath.startsWith(folderPrefix)
		? imagePath.slice(folderPrefix.length)
		: imagePath.replace(/^\/+/, '');
	const lastDot = relative.lastIndexOf('.');
	if (lastDot === -1) {
		return { base: relative, ext: 'jpg' };
	}
	return {
		base: relative.slice(0, lastDot),
		ext: relative.slice(lastDot + 1),
	};
}

// Reads the filename/extension inputs (only present/editable when no image is stored yet) and composes a candidate filename.
function readComposedFilename(row) {
	const filenameInput = row.querySelector('.variant-image-filename');
	const extInput = row.querySelector('.variant-image-ext');
	const base = slugify(filenameInput?.value || '');
	const ext = (extInput?.value || 'jpg')
		.trim()
		.toLowerCase()
		.replace(/^\.+/, '');
	return { base, ext, filename: base ? `${base}.${ext}` : '' };
}

export function createFormView({
	formContainer,
	formHeading,
	elementForm,
	formCategory,
	formName,
	formSlug,
	formStatus,
	formSaveBtn,
	variantFormRows,
	addVariantBtn,
	dataClient,
	storageService,
	modals,
	navigateTo,
	categories,
	getRoute,
}) {
	let elementId = null;
	let deletedVariants = [];
	let initialSnapshot = '';
	let generationInFlight = false;
	let autoSyncSlug = true;
	let autoSyncFirstFilename = true;
	let neutralVoidReferenceImages;

	// Entity reference generation reuses the Neutral Void background, same as the public generator.
	async function getNeutralVoidReferenceImages() {
		if (neutralVoidReferenceImages === undefined) {
			try {
				const [neutralVoid] =
					await dataClient.getElementBySlug(NEUTRAL_VOID_SLUG);
				const variant = neutralVoid?.game_element_variants?.[0];
				neutralVoidReferenceImages = variant?.image
					? await loadReferenceImages([
							{
								elementType: 'location',
								elementName: neutralVoid.name,
								variantName: variant.variant_name,
								image: variant.image,
							},
						])
					: [];
			} catch {
				neutralVoidReferenceImages = [];
			}
		}
		return neutralVoidReferenceImages;
	}

	formName.addEventListener('input', () => {
		if (autoSyncSlug) {
			formSlug.value = slugify(formName.value);
		}
		if (autoSyncFirstFilename) {
			const firstRow = variantFormRows.querySelector('.variant-form-row');
			const filenameInput = firstRow?.querySelector(
				'.variant-image-filename',
			);
			if (filenameInput) {
				filenameInput.value = slugify(formName.value);
				filenameInput.dispatchEvent(new Event('input'));
			}
		}
	});

	formSlug.addEventListener('input', () => {
		autoSyncSlug = false;
	});

	formName.addEventListener('blur', () => {
		autoSyncSlug = false;
		autoSyncFirstFilename = false;
	});

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
			deletedVariants = [];
			autoSyncSlug = route.name === 'add';
			autoSyncFirstFilename = route.name === 'add';
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
		const folder = CATEGORY_FOLDERS[formCategory.value];
		const folderPrefix = `/${folder}/`;
		const existingImage = variant.image ?? '';
		const parsed = parseImagePath(existingImage, folderPrefix);
		const existingFilename = parsed.base;
		const existingExt = parsed.ext;
		const hasStoredImage = Boolean(existingImage);
		row.dataset.originalImage = existingImage;

		const imageFieldHtml = hasStoredImage
			? `
				<label class="variant-image-filename-label">Image Path
					<span class="stored-image-path">${existingImage}</span>
				</label>
			`
			: `
				<label class="variant-image-filename-label">Image Filename
					<div class="variant-image-filename-row">
						<span class="variant-image-folder-prefix">${folderPrefix}</span>
						<input class="variant-image-filename" placeholder="e.g. river-crinos" value="${existingFilename}" aria-label="Filename" />
						<span class="variant-image-dot">.</span>
						<input class="variant-image-ext" placeholder="jpg" value="${existingExt}" aria-label="Extension" />
					</div>
				</label>
			`;

		row.innerHTML = `
			<div class="variant-info-col">
				<div class="variant-meta-row">
					<label class="variant-name-field">Variant Name*<input class="variant-name" required value="${defaultName}" /></label>
					<label class="variant-sort-field">Sort Order<input class="variant-sort" type="number" min="1" value="${variant.sort_order ?? ''}" /></label>
					<button class="delete-variant-btn delete" type="button" title="Delete variant" aria-label="Delete variant"><i class="fa-solid fa-trash-can"></i></button>
				</div>
				<label class="variant-desc-field">Description*<textarea class="variant-desc" required>${variant.variant_desc ?? ''}</textarea></label>
			</div>
			<div class="variant-image-col">
				<div class="variant-image-field">
					${imageFieldHtml}
					<input type="hidden" class="variant-image" value="${existingImage}" />
					<div class="variant-image-actions">
						<button class="generate-reference-btn" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate</button>
						<button class="variant-image-upload-btn" type="button"><i class="fa-solid fa-upload"></i> Upload</button>
						<input type="file" class="variant-image-upload" accept="image/*" hidden />
						<button class="variant-image-download-btn" type="button"><i class="fa-solid fa-download"></i> Download</button>
					</div>
					<p class="generate-status status"></p>
					<div class="admin-image-preview" aria-label="Image preview"></div>
				</div>
			</div>
		`;
		row.querySelector('.delete-variant-btn').addEventListener(
			'click',
			async () => {
				if (row.dataset.variantId) {
					const confirmed = await modals.showConfirmation(
						'Confirm Deletion',
						`Delete the ${row.querySelector('.variant-name').value} variant?`,
					);
					if (!confirmed) return;
					deletedVariants.push({
						id: row.dataset.variantId,
						image: row.dataset.originalImage,
					});
				}
				releasePendingImage(row);
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

		const filenameInput = row.querySelector('.variant-image-filename');
		const extInput = row.querySelector('.variant-image-ext');
		const hiddenImageInput = row.querySelector('.variant-image');
		const imagePreview = row.querySelector('.admin-image-preview');

		function updateHiddenPath() {
			if (hasStoredImage && !row._pendingImageBlob) {
				hiddenImageInput.value = row.dataset.originalImage;
				return;
			}
			if (hasStoredImage && row._pendingImageBlob) {
				hiddenImageInput.value = row.dataset.originalImage;
				return;
			}
			if (!filenameInput) return;
			const { filename } = readComposedFilename(row);
			hiddenImageInput.value = filename
				? `${folderPrefix}${filename}`
				: '';
		}

		const updatePreview = () => {
			imagePreview.replaceChildren();
			if (row._pendingImageObjectUrl) {
				const image = document.createElement('img');
				image.src = row._pendingImageObjectUrl;
				image.alt = 'Generated reference preview';
				imagePreview.append(image);
				return;
			}
			const value = hiddenImageInput.value.trim();
			if (!value) return;
			const image = document.createElement('img');
			image.src = getPublicImageUrl(value);
			image.alt = 'Variant preview';
			imagePreview.append(image);
		};

		if (filenameInput) {
			filenameInput.addEventListener('input', event => {
				if (event.isTrusted) {
					autoSyncFirstFilename = false;
				}
				updateHiddenPath();
				updatePreview();
			});
		}
		if (extInput) {
			extInput.addEventListener('input', () => {
				updateHiddenPath();
				updatePreview();
			});
		}
		updatePreview();

		const generateBtn = row.querySelector('.generate-reference-btn');
		const generateStatusEl = row.querySelector('.generate-status');
		const downloadBtn = row.querySelector('.variant-image-download-btn');
		const uploadBtn = row.querySelector('.variant-image-upload-btn');
		const uploadInput = row.querySelector('.variant-image-upload');
		refreshImageControls(row);

		uploadBtn.addEventListener('click', () => {
			uploadInput.click();
		});

		generateBtn.addEventListener('click', async () => {
			if (generationInFlight) return;
			const desc = row.querySelector('.variant-desc').value.trim();
			if (!desc) {
				generateStatusEl.textContent = 'Add a description first.';
				return;
			}
			const proceed = await confirmOverwriteIfNeeded(row);
			if (!proceed) return;
			setGenerationBusy(true);
			generateStatusEl.textContent = 'Generating...';
			try {
				const prompt = buildReferenceImagePrompt({
					category: formCategory.value,
					name: row.querySelector('.variant-name').value.trim(),
					description: desc,
				});
				const referenceImages =
					formCategory.value === 'location'
						? []
						: await getNeutralVoidReferenceImages();
				const result = await generateImageWithNetworkRetry({
					prompt,
					referenceImages,
					onRetry: () => {
						generateStatusEl.textContent =
							'Connection issue, retrying...';
					},
				});
				if (!result.blob) {
					generateStatusEl.textContent =
						'No image returned. Try again.';
					return;
				}
				releasePendingImage(row);
				row._pendingImageBlob = result.blob;
				row._pendingImageObjectUrl = URL.createObjectURL(result.blob);

				if (!hasStoredImage && extInput) {
					extInput.value = extensionFromMime(result.blob.type);
				}
				updateHiddenPath();

				generateStatusEl.textContent =
					'Preview ready. It will upload when you Save.';
				updatePreview();
				refreshImageControls(row);
			} catch (error) {
				generateStatusEl.textContent = error.message;
			} finally {
				setGenerationBusy(false);
			}
		});

		uploadInput.addEventListener('change', async () => {
			const file = uploadInput.files?.[0];
			uploadInput.value = '';
			if (!file) return;
			const proceed = await confirmOverwriteIfNeeded(row);
			if (!proceed) return;
			releasePendingImage(row);
			row._pendingImageBlob = file;
			row._pendingImageObjectUrl = URL.createObjectURL(file);

			if (!hasStoredImage) {
				const lastDot = file.name.lastIndexOf('.');
				const base =
					lastDot === -1 ? file.name : file.name.slice(0, lastDot);
				const ext =
					lastDot === -1 ? 'jpg' : file.name.slice(lastDot + 1);
				if (filenameInput && !filenameInput.value.trim()) {
					filenameInput.value = slugify(base);
				}
				if (extInput) {
					extInput.value = ext.toLowerCase();
				}
			}
			updateHiddenPath();

			generateStatusEl.textContent =
				'Preview ready. It will upload when you Save.';
			updatePreview();
			refreshImageControls(row);
		});

		downloadBtn.addEventListener('click', () => downloadCurrentImage(row));
	}

	async function confirmOverwriteIfNeeded(row) {
		if (!(row.dataset.originalImage && !row._pendingImageBlob)) return true;
		return modals.showConfirmation(
			'Replace saved reference image?',
			'This will overwrite the previously saved reference image once you Save. You can download the current image first if you want to keep a copy.',
			{
				cancelLabel: 'Cancel',
				confirmLabel: 'Continue',
				extraLabel: 'Download Current Image',
				onExtra: () => downloadCurrentImage(row),
			},
		);
	}

	async function downloadCurrentImage(row) {
		const path = row.dataset.originalImage;
		if (!path) return;
		const response = await fetch(getPublicImageUrl(path));
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = path.split('/').pop();
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Reflects whether a variant currently has (or will have) an image: button label and download availability.
	function refreshImageControls(row) {
		const hasImage = Boolean(
			row.dataset.originalImage || row._pendingImageBlob,
		);
		row.querySelector('.generate-reference-btn').innerHTML =
			`<i class="fa-solid fa-wand-magic-sparkles"></i> ${hasImage ? 'Regenerate' : 'Generate'}`;
		row.querySelector('.variant-image-download-btn').disabled =
			!row.dataset.originalImage;
	}

	function releasePendingImage(row) {
		if (row._pendingImageObjectUrl) {
			URL.revokeObjectURL(row._pendingImageObjectUrl);
		}
		row._pendingImageBlob = null;
		row._pendingImageObjectUrl = null;
	}

	function setGenerationBusy(busy) {
		generationInFlight = busy;
		formSaveBtn.disabled = busy;
		for (const btn of variantFormRows.querySelectorAll(
			'.generate-reference-btn, .variant-image-upload-btn',
		)) {
			btn.disabled = busy;
		}
	}

	async function save(event) {
		event.preventDefault();
		if (generationInFlight) return;
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

		const slug = formSlug.value.trim();
		const [existingBySlug] = await dataClient
			.getElementBySlug(slug)
			.catch(() => []);
		if (existingBySlug && existingBySlug.id !== elementId) {
			return setStatus(
				formStatus,
				'That slug is already in use by another element.',
			);
		}

		const folder = CATEGORY_FOLDERS[formCategory.value];
		const folderPrefix = `/${folder}/`;
		const folderListingCache = new Map();
		const listFolderCached = async () => {
			if (!folderListingCache.has(folder)) {
				folderListingCache.set(
					folder,
					await storageService.listFolder(folder),
				);
			}
			return folderListingCache.get(folder);
		};
		for (const row of rows) {
			if (!row._pendingImageBlob) continue;
			const originalImage = row.dataset.originalImage || '';
			if (originalImage) {
				// Reusing existing image path on regenerate / replace
				continue;
			}
			const { base, filename: candidateFilename } =
				readComposedFilename(row);
			if (!base) {
				return setStatus(
					formStatus,
					`Enter a filename for the ${row.querySelector('.variant-name').value.trim()} variant's image.`,
				);
			}
			const existingNames = await listFolderCached();
			const conflict = existingNames.some(
				existing =>
					existing.toLowerCase() === candidateFilename.toLowerCase(),
			);
			if (conflict) {
				return setStatus(
					formStatus,
					`An image named "${candidateFilename}" already exists in ${folderPrefix}. Choose a different filename.`,
				);
			}
		}

		try {
			// Keyed on elementId, not route.name: a retry after a partial failure
			// (element created, variant/image write failed) must update, not duplicate.
			if (!elementId) {
				const [created] = await dataClient.createElement({
					element_type: formCategory.value,
					name: formName.value.trim(),
					slug,
				});
				elementId = created.id;
			} else {
				await dataClient.updateElement(elementId, {
					element_type: formCategory.value,
					name: formName.value.trim(),
					slug,
				});
			}
			for (const row of rows) {
				const previousImage = row.dataset.originalImage || '';
				let imagePath = row
					.querySelector('.variant-image')
					.value.trim();
				if (row._pendingImageBlob) {
					if (previousImage) {
						imagePath = previousImage;
					} else {
						const { filename } = readComposedFilename(row);
						imagePath = `${folderPrefix}${filename}`;
					}
					await storageService.uploadImage(
						imagePath,
						row._pendingImageBlob,
					);
				}
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
					image: imagePath,
				};
				const id = row.dataset.variantId;
				if (id) await dataClient.updateVariant(id, payload);
				else await dataClient.createVariant(payload);

				if (
					row._pendingImageBlob &&
					previousImage &&
					previousImage !== imagePath
				) {
					await storageService.deleteImage(previousImage);
				}
				if (row._pendingImageBlob) {
					row.dataset.originalImage = imagePath;
					releasePendingImage(row);
					refreshImageControls(row);
				}
			}
			for (const { id, image } of deletedVariants) {
				await dataClient.deleteVariant(id);
				if (image) await storageService.deleteImage(image);
			}
			deletedVariants = [];
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
