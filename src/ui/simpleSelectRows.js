// Shared controller for single-select row lists that can be removed to zero.
export function initSimpleSelectRows({
	container,
	addBtn,
	dataMap,
	rowClassName,
	selectClassName,
	maxRows,
	getStoredRows,
	setStoredRows,
	entityLabel,
	entityArticle,
	excludeChosen = false,
}) {
	function getAvailableKeys(excludeSelectEl) {
		if (!excludeChosen) return Object.keys(dataMap);
		const chosenElsewhere = [
			...container.querySelectorAll(`.${selectClassName}`),
		]
			.filter(select => select !== excludeSelectEl)
			.map(select => select.value);
		return Object.keys(dataMap).filter(
			key => !chosenElsewhere.includes(key),
		);
	}

	// Rebuilds every row's options so a value chosen in one row disappears from the others.
	function refreshOptions() {
		if (!excludeChosen) return;
		for (const select of container.querySelectorAll(
			`.${selectClassName}`,
		)) {
			const currentValue = select.value;
			const availableKeys = getAvailableKeys(select);
			select.innerHTML = '';
			for (const key of availableKeys) {
				select.add(new Option(dataMap[key].name, key));
			}
			if (availableKeys.includes(currentValue))
				select.value = currentValue;
		}
	}

	function createRow(presetKey) {
		const row = document.createElement('div');
		row.className = rowClassName;

		const select = document.createElement('select');
		select.className = selectClassName;
		for (const key of getAvailableKeys(select)) {
			select.add(new Option(dataMap[key].name, key));
		}
		if (presetKey && dataMap[presetKey]) select.value = presetKey;
		select.addEventListener('change', () => {
			refreshOptions();
			persistRows();
		});

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'removeRowBtn';
		removeBtn.textContent = '✕';
		removeBtn.addEventListener('click', () => {
			row.remove();
			refreshOptions();
			updateAddButtonState();
			persistRows();
		});

		row.append(select, removeBtn);
		container.append(row);
	}

	function updateAddButtonState() {
		const rowCount = container.querySelectorAll(`.${rowClassName}`).length;
		const cap = excludeChosen ? Object.keys(dataMap).length : maxRows;
		addBtn.hidden = rowCount >= cap;
		addBtn.textContent =
			rowCount === 0
				? `Select ${entityArticle} ${entityLabel}`
				: `Add another ${entityLabel}`;
	}

	function persistRows() {
		const rows = [...container.querySelectorAll(`.${selectClassName}`)].map(
			select => select.value,
		);
		setStoredRows(rows);
	}

	function restoreRows() {
		const validRows = getStoredRows().filter(key => dataMap[key]);
		for (const key of validRows) createRow(key);
		refreshOptions();
		updateAddButtonState();
	}

	addBtn.addEventListener('click', () => {
		createRow();
		refreshOptions();
		updateAddButtonState();
		persistRows();
	});

	restoreRows();

	return {
		getSelections() {
			return [...container.querySelectorAll(`.${selectClassName}`)].map(
				select => {
					const { name, description, imageFile } =
						dataMap[select.value];
					return { name, description, imageFile };
				},
			);
		},
		hasAtLeastOneRow() {
			return container.querySelectorAll(`.${rowClassName}`).length > 0;
		},
	};
}
