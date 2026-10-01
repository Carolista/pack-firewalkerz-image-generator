import { focusFirst, trapFocus } from '../../src/ui/focusTrap.js';

export function createSubcategoryModal({
	overlay,
	heading,
	status,
	createForm,
	nameInput,
	list,
	closeBtn,
	dataClient,
	categories,
	onChange,
}) {
	const modal = overlay.querySelector('.modal');
	let elementType;
	let subcategories = [];
	let releaseFocusTrap;
	let previouslyFocusedElement;

	createForm.addEventListener('submit', createSubcategory);
	closeBtn.addEventListener('click', close);
	overlay.addEventListener('click', event => {
		if (event.target === overlay) close();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !overlay.hidden) close();
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
		const name = nameInput.value.trim().replace(/\s+/g, ' ');
		if (!name) return setStatus('Enter a subcategory name.');
		if (hasDuplicateName(name))
			return setStatus(
				'That subcategory already exists for this category.',
			);

		setFormBusy(true);
		setStatus('Adding subcategory...');
		try {
			await dataClient.createSubcategory({
				element_type: elementType,
				name,
			});
			nameInput.value = '';
			await refresh();
			await onChange?.(elementType);
			nameInput.focus();
		} catch (error) {
			setStatus(error.message);
		} finally {
			setFormBusy(false);
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
			setStatus(error.message);
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
				confirmRemove(row, subcategory),
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
		saveBtn.addEventListener('click', async () => {
			const name = input.value.trim().replace(/\s+/g, ' ');
			if (!name) return setStatus('Enter a subcategory name.');
			if (hasDuplicateName(name, subcategory.id))
				return setStatus(
					'That subcategory already exists for this category.',
				);
			setStatus('Saving subcategory...');
			try {
				await dataClient.updateSubcategory(subcategory.id, { name });
				await refresh();
				await onChange?.(elementType);
			} catch (error) {
				setStatus(error.message);
			}
		});
		cancelBtn.addEventListener('click', renderList);
	}

	function confirmRemove(row, subcategory) {
		const message = document.createElement('span');
		message.textContent = `Remove ${subcategory.name}? `;
		const confirmBtn = document.createElement('button');
		confirmBtn.type = 'button';
		confirmBtn.textContent = 'Confirm';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.textContent = 'Cancel';
		row.replaceChildren(message, confirmBtn, cancelBtn);
		confirmBtn.addEventListener('click', async () => {
			setStatus('Removing subcategory...');
			try {
				await dataClient.deleteSubcategory(subcategory.id);
				await refresh();
				await onChange?.(elementType);
			} catch (error) {
				setStatus(error.message);
			}
		});
		cancelBtn.addEventListener('click', renderList);
	}

	function hasDuplicateName(name, excludedId) {
		const normalizedName = normalizeName(name);
		return subcategories.some(
			subcategory =>
				subcategory.id !== excludedId &&
				normalizeName(subcategory.name) === normalizedName,
		);
	}

	function normalizeName(name) {
		return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
	}

	function setFormBusy(isBusy) {
		for (const control of createForm.querySelectorAll('input, button')) {
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
