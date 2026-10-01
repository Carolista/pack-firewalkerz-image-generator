export function getFilteredSelectionId(
	elements,
	currentId,
	matchesFilter,
	preferredId,
	preferCurrentInScope = false,
) {
	const currentElement = elements.find(element => element.id === currentId);
	if (
		preferCurrentInScope &&
		currentElement &&
		matchesFilter(currentElement)
	) {
		return currentId;
	}
	const preferredElement = elements.find(
		element => element.id === preferredId,
	);
	if (preferredElement && matchesFilter(preferredElement))
		return preferredElement.id;
	if (currentElement && matchesFilter(currentElement)) return currentId;
	return elements.find(matchesFilter)?.id ?? '';
}

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
	onPreview,
	filterSelect,
	matchesFilter = () => true,
	getFilterSelections = () => ({}),
	setFilterSelections = () => {},
	getAddRowSelection = () => null,
	onSelectionChange = () => {},
	showVariantWhenSingleVariant = false,
}) {
	let rowIdCounter = 0;
	let filterChangeInProgress = false;
	const rowChangeHandlers = new WeakMap();
	const getElement = id => elements.find(element => element.id === id);

	function getAvailableIds(excludeSelect, preserveId) {
		const chosen = [
			...container.querySelectorAll(`.${elementSelectClassName}`),
		]
			.filter(select => select !== excludeSelect)
			.map(select => select.value);
		return elements
			.filter(
				element =>
					(matchesFilter(element) || element.id === preserveId) &&
					(allowDuplicates || !chosen.includes(element.id)),
			)
			.map(element => element.id);
	}

	function refreshElementOptions() {
		for (const select of container.querySelectorAll(
			`.${elementSelectClassName}`,
		)) {
			const current = select.value;
			select.replaceChildren();
			for (const id of getAvailableIds(select, current)) {
				select.add(new Option(getElement(id).name, id));
			}
			select.value = current;
		}
	}

	function populateVariantField(elementSelect, row, presetVariantId) {
		const existing = row.querySelector('.variant-field');
		const element = getElement(elementSelect.value);
		if (!showVariantWhenSingleVariant && element.variants.length <= 1) {
			existing?.remove();
			return;
		}

		const field = existing ?? document.createElement('div');
		field.className = 'field variant-field';
		const label = document.createElement('label');
		label.textContent = 'Variant';
		const select = document.createElement('select');
		select.className = variantSelectClassName;
		select.id = `${elementSelect.id}-variant`;
		label.htmlFor = select.id;
		select.addEventListener('change', () => {
			persistRows();
			onSelectionChange(getRowSelection(elementSelect, row));
		});
		field.replaceChildren(label, select);
		for (const variant of element.variants) {
			select.add(new Option(variant.variantName, variant.variantId));
		}
		if (presetVariantId) select.value = presetVariantId;
		if (!existing) {
			const removeBtn = row.querySelector('.remove-row-btn');
			if (removeBtn) row.insertBefore(field, removeBtn);
			else row.append(field);
		}
	}

	function createRow(presetElementId, presetVariantId) {
		const row = document.createElement('div');
		row.className = rowClassName;
		const field = document.createElement('div');
		field.className = 'field element-field';
		const label = document.createElement('label');
		label.textContent = entityLabel;
		const select = document.createElement('select');
		select.className = elementSelectClassName;
		select.id = `${elementSelectClassName}-${rowIdCounter++}`;
		label.htmlFor = select.id;
		const availableIds = getAvailableIds(select);
		for (const id of availableIds) {
			select.add(new Option(getElement(id).name, id));
		}
		select.value = presetElementId ?? availableIds[0] ?? '';
		field.append(label, select);
		row.append(field);
		populateVariantField(select, row, presetVariantId);
		const handleElementChange = preferredVariantId => {
			populateVariantField(select, row);
			if (preferredVariantId) {
				const variantSelect = row.querySelector(
					`.${variantSelectClassName}`,
				);
				if (variantSelect) variantSelect.value = preferredVariantId;
			}
			updateActionLabels();
			refreshElementOptions();
			persistRows();
		};
		rowChangeHandlers.set(select, handleElementChange);
		select.addEventListener('change', () => {
			handleElementChange();
			onSelectionChange(getRowSelection(select, row));
		});

		const previewBtn = document.createElement('button');
		previewBtn.type = 'button';
		previewBtn.className = 'preview-row-btn';
		previewBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
		previewBtn.addEventListener('click', () => {
			onPreview?.(getElement(select.value), previewBtn);
		});

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'remove-row-btn';
		removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
		removeBtn.addEventListener('click', () => {
			row.remove();
			refreshElementOptions();
			updateAddButtonState();
			persistRows();
		});
		row.append(previewBtn, removeBtn);
		container.append(row);
		updateActionLabels();

		function updateActionLabels() {
			const selectedElement = getElement(select.value);
			const elementName = selectedElement?.name ?? entityLabel;
			const previewLabel = `Preview ${elementName}`;
			const removeLabel = `Remove ${elementName}`;
			previewBtn.setAttribute('aria-label', previewLabel);
			previewBtn.title = previewLabel;
			removeBtn.setAttribute('aria-label', removeLabel);
			removeBtn.title = removeLabel;
		}
	}

	function updateAddButtonState() {
		const count = container.querySelectorAll(`.${rowClassName}`).length;
		const cap =
			allowDuplicates && elements.length ? maxRows : elements.length;
		addBtn.hidden = count >= cap;
		addBtn.innerHTML =
			count === 0
				? `<i class="fa-solid fa-user-magnifying-glass"></i> Select ${entityArticle} ${entityLabel}`
				: `<i class="fa-solid fa-circle-plus"></i> Add another ${entityLabel}`;
	}

	filterSelect?.addEventListener('change', handleFilterChange);

	function handleFilterChange() {
		const filterKey = filterSelect.value || '__all__';
		const storedSelections = getFilterSelections();
		const preferredRows = Array.isArray(storedSelections?.[filterKey])
			? storedSelections[filterKey]
			: [];
		const isAllItems = filterKey === '__all__';
		refreshElementOptions();
		filterChangeInProgress = true;
		try {
			for (const [index, select] of [
				...container.querySelectorAll(`.${elementSelectClassName}`),
			].entries()) {
				const preferredRow = preferredRows[index];
				const nextId = getFilteredSelectionId(
					elements,
					select.value,
					matchesFilter,
					isAllItems ? undefined : preferredRow?.elementId,
					isAllItems,
				);
				if (!nextId) continue;
				const nextElement = getElement(nextId);
				const preferredVariantId =
					!isAllItems &&
					preferredRow?.elementId === nextId &&
					nextElement.variants.some(
						variant => variant.variantId === preferredRow.variantId,
					)
						? preferredRow.variantId
						: undefined;
				const row = select.closest(`.${rowClassName}`);
				const currentVariantId = row.querySelector(
					`.${variantSelectClassName}`,
				)?.value;
				const nextVariantId = isAllItems
					? currentVariantId
					: (preferredVariantId ?? nextElement.variants[0].variantId);
				if (
					nextId !== select.value ||
					(currentVariantId && currentVariantId !== nextVariantId)
				) {
					select.value = nextId;
					rowChangeHandlers.get(select)?.(preferredVariantId);
				}
			}
		} finally {
			filterChangeInProgress = false;
		}
		refreshElementOptions();
		persistRows();
	}

	function persistRows() {
		setStoredRows(
			[...container.querySelectorAll(`.${rowClassName}`)].map(row => {
				const elementId = row.querySelector(
					`.${elementSelectClassName}`,
				).value;
				const element = getElement(elementId);
				return {
					elementId,
					variantId:
						row.querySelector(`.${variantSelectClassName}`)
							?.value ?? element.variants[0].variantId,
				};
			}),
		);
		if (!filterSelect || filterChangeInProgress) return;
		const filterKey = filterSelect.value || '__all__';
		const selections = getFilterSelections();
		setFilterSelections({
			...selections,
			[filterKey]: [
				...container.querySelectorAll(`.${rowClassName}`),
			].map(row => {
				const elementId = row.querySelector(
					`.${elementSelectClassName}`,
				).value;
				const element = getElement(elementId);
				return {
					elementId,
					variantId:
						row.querySelector(`.${variantSelectClassName}`)
							?.value ?? element.variants[0].variantId,
				};
			}),
		});
	}

	function getRowSelection(elementSelect, row) {
		const element = getElement(elementSelect.value);
		if (!element) return null;
		return {
			elementId: element.id,
			variantId:
				row.querySelector(`.${variantSelectClassName}`)?.value ??
				element.variants[0].variantId,
		};
	}

	addBtn.addEventListener('click', () => {
		const selection = getAddRowSelection();
		createRow(selection?.elementId, selection?.variantId);
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
						elementType: element.elementType,
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
