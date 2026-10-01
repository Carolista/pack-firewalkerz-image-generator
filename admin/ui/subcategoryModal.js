import { focusFirst, trapFocus } from '../../src/ui/focusTrap.js';

const MAX_LISTED_ELEMENTS = 8;

export function describeSubcategoryError(error) {
	switch (error?.code) {
		case '23505':
			return 'That subcategory already exists for this category.';
		case '23514':
			return 'Subcategory names must be 1 to 80 characters.';
		case '23503':
			return 'That subcategory is still in use. Refresh and try again.';
		case 'P0002':
			return 'That subcategory no longer exists.';
		default:
			return error?.message || 'Something went wrong. Please try again.';
	}
}

// Another admin's change may have made our list stale for these errors.
const STALE_LIST_CODES = new Set(['23505', '23503', 'P0002']);

export function createSubcategoryModal({
	overlay,
	heading,
	status,
	createForm,
	nameInput,
	list,
	closeBtn,
	dataClient,
	modals,
	categories,
	onChange,
}) {
	const modal = overlay.querySelector('.modal');
	let elementType;
	let subcategories = [];
	let busy = false;
	let releaseFocusTrap;
	let previouslyFocusedElement;

	createForm.addEventListener('submit', createSubcategory);
	closeBtn.addEventListener('click', close);
	overlay.addEventListener('click', event => {
		if (event.target === overlay) close();
	});
	document.addEventListener('keydown', event => {
		if (
			event.key === 'Escape' &&
			!event.defaultPrevented &&
			!overlay.hidden
		)
			close();
	});

	return {
		async open(category) {
			elementType = category;
			heading.textContent = `Manage ${categories[category].shortPlural} subcategories`;
			previouslyFocusedElement = document.activeElement;
			overlay.hidden = false;
			releaseFocusTrap = trapFocus(modal);
			await refresh();
			focusFirst(modal);
		},
	};

	async function createSubcategory(event) {
		event.preventDefault();
		if (busy) return;
		const name = normalizeDisplayName(nameInput.value);
		if (!name) return setStatus('Enter a subcategory name.');
		if (hasDuplicateName(name))
			return setStatus(
				'That subcategory already exists for this category.',
			);

		setBusy(true);
		setStatus('Adding subcategory...');
		try {
			await dataClient.createSubcategory({
				element_type: elementType,
				name,
			});
			nameInput.value = '';
			await refresh();
			await notifyChange();
		} catch (error) {
			await handleFailure(error);
		} finally {
			setBusy(false);
			nameInput.focus();
		}
	}

	async function refresh() {
		setStatus('Loading subcategories...');
		try {
			subcategories = await dataClient.listSubcategories(elementType);
			renderList();
			setStatus('');
		} catch (error) {
			subcategories = [];
			renderList();
			setStatus(describeSubcategoryError(error));
		}
	}

	async function handleFailure(error) {
		const message = describeSubcategoryError(error);
		if (STALE_LIST_CODES.has(error.code)) {
			await refresh();
			if (error.code === 'P0002') await notifyChange();
		}
		setStatus(message);
	}

	// The change already succeeded, so a failed view refresh must not surface as a modal error.
	async function notifyChange() {
		try {
			await onChange?.(elementType);
		} catch {
			// Views reload themselves on next navigation.
		}
	}

	function renderList() {
		list.replaceChildren();
		if (!subcategories.length) {
			const empty = document.createElement('li');
			empty.textContent = 'No subcategories yet.';
			list.append(empty);
			return;
		}

		for (const subcategory of subcategories) {
			const row = document.createElement('li');
			row.className = 'subcategory-modal-row';
			const name = document.createElement('span');
			name.textContent = subcategory.name;
			const actions = document.createElement('div');
			actions.className = 'subcategory-modal-actions';

			const renameBtn = document.createElement('button');
			renameBtn.type = 'button';
			renameBtn.title = `Rename ${subcategory.name}`;
			renameBtn.setAttribute('aria-label', renameBtn.title);
			renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
			renameBtn.addEventListener('click', () =>
				startRename(row, subcategory),
			);

			const removeBtn = document.createElement('button');
			removeBtn.type = 'button';
			removeBtn.className = 'delete';
			removeBtn.title = `Remove ${subcategory.name}`;
			removeBtn.setAttribute('aria-label', removeBtn.title);
			removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
			removeBtn.addEventListener('click', () =>
				requestRemove(row, subcategory),
			);

			actions.append(renameBtn, removeBtn);
			row.append(name, actions);
			list.append(row);
		}
	}

	function startRename(row, subcategory) {
		const input = document.createElement('input');
		input.value = subcategory.name;
		input.maxLength = 80;
		input.setAttribute('aria-label', `New name for ${subcategory.name}`);
		const saveBtn = document.createElement('button');
		saveBtn.type = 'button';
		saveBtn.textContent = 'Save';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.textContent = 'Cancel';
		row.replaceChildren(input, saveBtn, cancelBtn);
		input.focus();
		input.select();
		input.addEventListener('keydown', event => {
			if (event.key === 'Enter') {
				event.preventDefault();
				saveBtn.click();
			} else if (event.key === 'Escape') {
				// Cancels only the rename; defaultPrevented keeps the modal open.
				event.preventDefault();
				renderList();
			}
		});
		saveBtn.addEventListener('click', async () => {
			if (busy) return;
			const name = normalizeDisplayName(input.value);
			if (!name) return setStatus('Enter a subcategory name.');
			if (name === subcategory.name) return renderList();
			if (hasDuplicateName(name, subcategory.id))
				return setStatus(
					'That subcategory already exists for this category.',
				);
			setBusy(true);
			setStatus('Saving subcategory...');
			try {
				const updated = await dataClient.updateSubcategory(
					subcategory.id,
					{ name },
				);
				// PostgREST returns no rows rather than an error when the row is gone or not writable.
				if (!updated?.length) {
					const missing = new Error();
					missing.code = 'P0002';
					throw missing;
				}
				await refresh();
				await notifyChange();
			} catch (error) {
				await handleFailure(error);
			} finally {
				setBusy(false);
			}
		});
		cancelBtn.addEventListener('click', renderList);
	}

	async function requestRemove(row, subcategory) {
		if (busy) return;
		setBusy(true);
		setStatus('Checking where this subcategory is used...');
		let assigned;
		try {
			assigned = await dataClient.listElementsBySubcategory(
				subcategory.id,
			);
		} catch (error) {
			setStatus(describeSubcategoryError(error));
			return;
		} finally {
			setBusy(false);
		}
		setStatus('');

		if (!assigned.length) return confirmInlineRemove(row, subcategory);

		const confirmed = await modals.showConfirmation(
			'Subcategory in use',
			describeUsage(subcategory, assigned),
			{
				cancelLabel: 'Keep Subcategory',
				confirmLabel: 'Unassign & Delete',
			},
		);
		if (confirmed) await removeSubcategory(subcategory);
		else focusFirst(modal);
	}

	function describeUsage(subcategory, assigned) {
		const shown = assigned
			.slice(0, MAX_LISTED_ELEMENTS)
			.map(element => element.name);
		const extra = assigned.length - shown.length;
		const names = extra
			? `${shown.join(', ')}, and ${extra} more`
			: shown.join(', ');
		const single = assigned.length === 1;
		return `"${subcategory.name}" is used by ${assigned.length} ${single ? 'element' : 'elements'}: ${names}. Deleting it will set ${single ? 'that element' : 'those elements'} to No subcategory.`;
	}

	function confirmInlineRemove(row, subcategory) {
		const message = document.createElement('span');
		message.textContent = `Remove ${subcategory.name}? `;
		const confirmBtn = document.createElement('button');
		confirmBtn.type = 'button';
		confirmBtn.textContent = 'Confirm';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.textContent = 'Cancel';
		row.replaceChildren(message, confirmBtn, cancelBtn);
		confirmBtn.addEventListener('click', () =>
			removeSubcategory(subcategory),
		);
		cancelBtn.addEventListener('click', renderList);
	}

	async function removeSubcategory(subcategory) {
		if (busy) return;
		setBusy(true);
		setStatus('Removing subcategory...');
		try {
			// Elements assigned after the preflight check are unassigned too, so the count comes from the RPC.
			const unassigned = await dataClient.deleteSubcategory(
				subcategory.id,
			);
			await refresh();
			await notifyChange();
			setStatus(
				unassigned
					? `Removed ${subcategory.name}. ${unassigned} element${unassigned === 1 ? ' was' : 's were'} set to No subcategory.`
					: `Removed ${subcategory.name}.`,
			);
		} catch (error) {
			await handleFailure(error);
		} finally {
			setBusy(false);
			nameInput.focus();
		}
	}

	function hasDuplicateName(name, excludedId) {
		const normalizedName = normalizeName(name);
		return subcategories.some(
			subcategory =>
				subcategory.id !== excludedId &&
				normalizeName(subcategory.name) === normalizedName,
		);
	}

	function normalizeDisplayName(name) {
		return name.trim().replace(/\s+/g, ' ');
	}

	function normalizeName(name) {
		return normalizeDisplayName(name).toLocaleLowerCase();
	}

	function setBusy(isBusy) {
		busy = isBusy;
		for (const control of modal.querySelectorAll(
			'#subcategory-create-form input, #subcategory-create-form button, .subcategory-list input, .subcategory-list button',
		)) {
			control.disabled = isBusy;
		}
	}

	function setStatus(message) {
		status.textContent = message;
	}

	function close() {
		overlay.hidden = true;
		releaseFocusTrap?.();
		releaseFocusTrap = null;
		previouslyFocusedElement?.focus();
	}
}
