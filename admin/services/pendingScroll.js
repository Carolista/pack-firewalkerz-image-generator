let pendingVariantId = null;

export function setPendingVariantId(id) {
	pendingVariantId = id;
}

export function takePendingVariantId() {
	const id = pendingVariantId;
	pendingVariantId = null;
	return id;
}
