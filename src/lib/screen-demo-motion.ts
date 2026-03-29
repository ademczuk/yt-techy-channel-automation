export interface Point {
  x: number;
  y: number;
}

export interface ScrollTick {
  deltaY: number;
  waitMs: number;
}

const SAFE_NAV_Y = 220;
const HEADER_DANGER_Y = 170;

export function buildHumanMousePath(
  start: Point,
  end: Point,
  steps = 24,
): Point[] {
  const totalSteps = Math.max(steps, 2);
  const points: Point[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const controlOffset = Math.max(Math.abs(dx), Math.abs(dy)) * 0.18;
  const controlPoint: Point = {
    x: start.x + dx * 0.5 + Math.sign(dy || 1) * controlOffset * 0.35,
    y: start.y + dy * 0.5 - Math.sign(dx || 1) * controlOffset * 0.2,
  };

  for (let index = 0; index < totalSteps; index += 1) {
    const t = index / (totalSteps - 1);
    const easedT = easeInOutCubic(t);
    points.push({
      x: round2(quadraticBezier(start.x, controlPoint.x, end.x, easedT)),
      y: round2(quadraticBezier(start.y, controlPoint.y, end.y, easedT)),
    });
  }

  return points;
}

export function buildCircularMousePath(
  center: Point,
  radius: number,
  loops = 1,
): Point[] {
  const totalLoops = Math.max(1, loops);
  const pointsPerLoop = 64;
  const points: Point[] = [];

  for (let loop = 0; loop < totalLoops; loop += 1) {
    for (let index = 0; index <= pointsPerLoop; index += 1) {
      const progress = index / pointsPerLoop;
      const angle = progress * Math.PI * 2;
      points.push({
        x: round2(center.x + Math.cos(angle) * radius),
        y: round2(center.y + Math.sin(angle) * radius * 0.72),
      });
    }
  }

  return points;
}

export function buildSmoothScrollTicks(deltaY: number, durationMs = 1200): ScrollTick[] {
  const segments = Math.max(6, Math.ceil(Math.abs(deltaY) / 90));
  const baseDelta = Math.trunc(deltaY / segments);
  let remainder = deltaY - baseDelta * segments;
  const waitMs = Math.max(24, Math.round(durationMs / segments));
  const ticks: ScrollTick[] = [];

  for (let index = 0; index < segments; index += 1) {
    const extra = remainder === 0 ? 0 : remainder > 0 ? 1 : -1;
    remainder -= extra;
    ticks.push({
      deltaY: baseDelta + extra,
      waitMs,
    });
  }

  return ticks;
}

export function buildSafeMouseWaypoints(
  from: Point,
  to: Point,
): Point[] {
  const fromInHeader = from.y < HEADER_DANGER_Y;
  const toInHeader = to.y < HEADER_DANGER_Y;

  if (fromInHeader && toInHeader) {
    return [to];
  }

  if (fromInHeader && !toInHeader) {
    return [
      { x: from.x, y: SAFE_NAV_Y },
      { x: to.x, y: SAFE_NAV_Y },
      to,
    ];
  }

  if (!fromInHeader && toInHeader) {
    return [
      { x: from.x, y: SAFE_NAV_Y },
      { x: to.x, y: SAFE_NAV_Y },
      to,
    ];
  }

  const laneY = Math.max(SAFE_NAV_Y, Math.min(from.y, to.y));
  return [
    { x: from.x, y: laneY },
    { x: to.x, y: laneY },
    to,
  ];
}

function quadraticBezier(start: number, control: number, end: number, t: number): number {
  const inv = 1 - t;
  return inv * inv * start + 2 * inv * t * control + t * t * end;
}

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
