import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCircularMousePath,
  buildHumanMousePath,
  buildSafeMouseWaypoints,
  buildSmoothScrollTicks,
} from "../src/lib/screen-demo-motion";

test("buildHumanMousePath creates an interpolated path from start to end", () => {
  const points = buildHumanMousePath(
    { x: 10, y: 20 },
    { x: 210, y: 120 },
    18,
  );

  assert.equal(points[0].x, 10);
  assert.equal(points[0].y, 20);
  assert.equal(points.at(-1)?.x, 210);
  assert.equal(points.at(-1)?.y, 120);
  assert.ok(points.length >= 18);
});

test("buildCircularMousePath creates a smooth loop around a target", () => {
  const points = buildCircularMousePath(
    { x: 300, y: 180 },
    64,
    1,
  );

  assert.ok(points.length >= 60);
  assert.ok(Math.abs(points[0].x - points.at(-1)!.x) < 2);
  assert.ok(Math.abs(points[0].y - points.at(-1)!.y) < 2);
});

test("buildSmoothScrollTicks breaks a large scroll into smaller increments", () => {
  const ticks = buildSmoothScrollTicks(560, 1600);

  assert.ok(ticks.length >= 6);
  assert.equal(ticks.reduce((sum, tick) => sum + tick.deltaY, 0), 560);
  assert.ok(ticks.every((tick) => tick.waitMs > 0));
});

test("buildSafeMouseWaypoints routes away from the top navigation before moving horizontally", () => {
  const waypoints = buildSafeMouseWaypoints(
    { x: 120, y: 96 },
    { x: 980, y: 420 },
  );

  assert.equal(waypoints.length, 3);
  assert.ok(waypoints[0].y >= 220);
  assert.equal(waypoints[1].y, waypoints[0].y);
  assert.deepEqual(waypoints.at(-1), { x: 980, y: 420 });
});
