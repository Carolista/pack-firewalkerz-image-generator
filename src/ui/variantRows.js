export function initVariantRows({
	container,
	addBtn,
	elements,
	rowClassName,
	elementSelectClassName,
	variantSelectClassName,
	maxRows,
	allowDuplicates,
	getStoredRows,
	setStoredRows,
	entityLabel,
	entityArticle,
}) {
	const getElement = id => elements.find(element => element.id === id);

	function getAvailableIds(excludeSelect) {
		if (allowDuplicates) return elements.map(element => element.id);
		const chosen = [
			...container.querySelectorAll(`.${elementSelectClassName}`),
		]
			.filter(select => select !== excludeSelect)
			.map(select => select.value);
		return elements
			.filter(element => !chosen.includes(element.id))
			.map(element => element.id);
	}

	function refreshElementOptions() {
		if (allowDuplicates) return;
		for (const select of container.querySelectorAll(
			`.${elementSelectClassName}`,
		)) {
			const current = select.value;
			select.replaceChildren();
			for (const id of getAvailableIds(select)) {
				select.add(new Option(getElement(id).name, id));
			}
			if (getAvailableIds(select).includes(current))
				select.value = current;
		}
	}

	function populateVariantField(elementSelect, row, presetVariantId) {
		const existing = row.querySelector('.variantField');
		const element = getElement(elementSelect.value);
		if (element.variants.length <= 1) {
			existing?.remove();
			return;
		}

		const field = existing ?? document.createElement('div');
		field.className = 'field variantField';
		const label = document.createElement('label');
		label.textContent = 'Variant';
		const select = document.createElement('select');
		select.className = variantSelectClassName;
		select.addEventListener('change', persistRows);
		field.replaceChildren(label, select);
		for (const variant of element.variants) {
			select.add(new Option(variant.variantName, variant.variantId));
		}
		if (presetVariantId) select.value = presetVariantId;
		if (!existing) {
			const removeBtn = row.querySelector('.removeRowBtn');
			if (removeBtn) row.insertBefore(field, removeBtn);
			else row.append(field);
		}
	}

	function createRow(presetElementId, presetVariantId) {
		const row = document.createElement('div');
		row.className = rowClassName;
		const field = document.createElement('div');
		field.className = 'field';
		const label = document.createElement('label');
		label.textContent = entityLabel;
		const select = document.createElement('select');
		select.className = elementSelectClassName;
		const availableIds = getAvailableIds(select);
		for (const id of availableIds) {
			select.add(new Option(getElement(id).name, id));
		}
		select.value = presetElementId ?? availableIds[0] ?? '';
		field.append(label, select);
		row.append(field);
		populateVariantField(select, row, presetVariantId);
		select.addEventListener('change', () => {
			populateVariantField(select, row);
			refreshElementOptions();
			persistRows();
		});

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'removeRowBtn';
		removeBtn.textContent = '✕';
		removeBtn.addEventListener('click', () => {
			row.remove();
			refreshElementOptions();
			updateAddButtonState();
			persistRows();
		});
		row.append(removeBtn);
		container.append(row);
	}

	function updateAddButtonState() {
		const count = container.querySelectorAll(`.${rowClassName}`).length;
		const cap = allowDuplicates ? maxRows : elements.length;
		addBtn.hidden = count >= cap;
		addBtn.textContent =
			count === 0
				? `Select ${entityArticle} ${entityLabel}`
				: `Add another ${entityLabel}`;
	}

	function persistRows() {
		setStoredRows(
			[...container.querySelectorAll(`.${rowClassName}`)].map(row => ({
				elementId: row.querySelector(`.${elementSelectClassName}`)
					.value,
				variantId:
					row.querySelector(`.${variantSelectClassName}`)?.value ??
					row.querySelector(`.${elementSelectClassName}`).value,
			})),
		);
	}

	addBtn.addEventListener('click', () => {
		createRow();
		refreshElementOptions();
		updateAddButtonState();
		persistRows();
	});

	const storedRows = getStoredRows();
	const validRows = Array.isArray(storedRows)
		? storedRows.filter(row => {
				const element = getElement(row.elementId);
				return (
					element &&
					element.variants.some(v => v.variantId === row.variantId)
				);
			})
		: [];
	for (const row of validRows) createRow(row.elementId, row.variantId);
	refreshElementOptions();
	updateAddButtonState();

	return {
		getSelections() {
			return [...container.querySelectorAll(`.${rowClassName}`)].map(
				row => {
					const element = getElement(
						row.querySelector(`.${elementSelectClassName}`).value,
					);
					const variantId =
						row.querySelector(`.${variantSelectClassName}`)
							?.value ?? element.variants[0].variantId;
					const variant = element.variants.find(
						v => v.variantId === variantId,
					);
					return {
						elementId: element.id,
						elementName: element.name,
						variantId: variant.variantId,
						variantName: variant.variantName,
						variantDesc: variant.variantDesc,
						image: variant.image,
					};
				},
			);
		},
		hasAtLeastOneRow() {
			return container.querySelectorAll(`.${rowClassName}`).length > 0;
		},
	};
}
