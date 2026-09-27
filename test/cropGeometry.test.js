import assert from 'node:assert/strict';
import test from 'node:test';

import {
	clampAxis,
	clampCenter,
	minZoomForAngle,
	normalizeAngle,
	normalizeSignedAngle,
	sourcePointAt,
	transformAroundAnchor,
} from '../admin/ui/cropGeometry.js';

function closeTo(actual, expected) {
	assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test('angle normalization crosses both full-turn seams without a jump', () => {
	closeTo(normalizeAngle(-Math.PI / 2), (3 * Math.PI) / 2);
	closeTo(normalizeAngle((5 * Math.PI) / 2), Math.PI / 2);
	closeTo(normalizeSignedAngle(2 * Math.PI - 0.1), -0.1);
	closeTo(normalizeSignedAngle(-2 * Math.PI + 0.1), 0.1);
});

test('rotation increases the minimum zoom only between quarter turns', () => {
	closeTo(minZoomForAngle(0), 1);
	closeTo(minZoomForAngle(Math.PI / 4), Math.SQRT2);
	closeTo(minZoomForAngle(Math.PI / 2), 1);
});

test('clamping centers an undersized axis and constrains panning on a larger one', () => {
	assert.equal(clampAxis(700, 600, 800), 400);
	assert.equal(clampAxis(-50, 200, 800), 200);
	assert.equal(clampAxis(900, 200, 800), 600);
	const center = clampCenter({
		viewportSize: 400,
		baseScale: 1,
		zoom: Math.SQRT2,
		angle: Math.PI / 4,
		centerX: 0,
		centerY: 900,
		sourceWidth: 800,
		sourceHeight: 600,
	});
	closeTo(center.centerX, 200);
	closeTo(center.centerY, 400);
});

test('source coordinates follow the inverse rotation on a portrait image', () => {
	const state = {
		viewportSize: 400,
		baseScale: 2,
		zoom: 1,
		angle: Math.PI / 2,
		centerX: 100,
		centerY: 200,
	};
	const center = sourcePointAt(200, 200, state);
	assert.deepEqual(center, { x: 100, y: 200 });
	const right = sourcePointAt(300, 200, state);
	closeTo(right.x, 100);
	closeTo(right.y, 150);
});

test('zoom and rotation preserve the source point under an unclamped anchor', () => {
	const state = {
		viewportSize: 400,
		baseScale: 2 / 3,
		zoom: 2,
		angle: 0,
		centerX: 400,
		centerY: 300,
		sourceWidth: 800,
		sourceHeight: 600,
	};
	const before = sourcePointAt(230, 150, state);
	const next = transformAroundAnchor(state, Math.PI / 6, 2.5, 230, 150, 6);
	const after = sourcePointAt(230, 150, { ...state, ...next });
	closeTo(after.x, before.x);
	closeTo(after.y, before.y);
	closeTo(next.angle, Math.PI / 6);
	closeTo(next.zoom, 2.5);
});

test('rotating to 45 degrees clamps zoom before exposing an image corner', () => {
	const state = {
		viewportSize: 400,
		baseScale: 1,
		zoom: 1,
		angle: 0,
		centerX: 200,
		centerY: 200,
		sourceWidth: 400,
		sourceHeight: 400,
	};
	const next = transformAroundAnchor(state, Math.PI / 4, 1, 200, 200, 6);
	closeTo(next.zoom, Math.SQRT2);
	closeTo(next.centerX, 200);
	closeTo(next.centerY, 200);
});
