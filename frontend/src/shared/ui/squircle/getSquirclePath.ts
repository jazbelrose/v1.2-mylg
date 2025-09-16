const PATH_CACHE = new Map<string, string>();

const CIRCLE_APPROXIMATION = 0.5522847498;
const HANDLE_EXTRA = 1 - CIRCLE_APPROXIMATION;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number): string {
  return Number.parseFloat(value.toFixed(4)).toString();
}

export function getSquirclePath(
  width: number,
  height: number,
  r = 20,
  k = 0.6,
): string {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new TypeError('Width and height must be finite numbers.');
  }

  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);

  if (safeWidth === 0 || safeHeight === 0) {
    return 'M 0 0';
  }

  const radius = clamp(r, 0, Math.min(safeWidth, safeHeight) / 2);
  const smoothing = clamp(k, 0, 1);

  if (radius === 0) {
    const rectPath = [
      'M 0 0',
      `L ${formatNumber(safeWidth)} 0`,
      `L ${formatNumber(safeWidth)} ${formatNumber(safeHeight)}`,
      `L 0 ${formatNumber(safeHeight)}`,
      'Z',
    ].join(' ');

    return rectPath;
  }

  const cacheKey = `${safeWidth}x${safeHeight}-r${radius}-k${smoothing}`;
  const cached = PATH_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const handle = radius * (CIRCLE_APPROXIMATION + HANDLE_EXTRA * smoothing);

  const topStartX = radius;
  const topEndX = safeWidth - radius;
  const rightStartY = radius;
  const rightEndY = safeHeight - radius;

  const pathSegments = [
    `M ${formatNumber(topStartX)} 0`,
    `L ${formatNumber(topEndX)} 0`,
    `C ${formatNumber(topEndX + handle)} 0 ${formatNumber(safeWidth)} ${formatNumber(rightStartY - handle)} ${formatNumber(safeWidth)} ${formatNumber(rightStartY)}`,
    `L ${formatNumber(safeWidth)} ${formatNumber(rightEndY)}`,
    `C ${formatNumber(safeWidth)} ${formatNumber(rightEndY + handle)} ${formatNumber(topEndX + handle)} ${formatNumber(safeHeight)} ${formatNumber(topEndX)} ${formatNumber(safeHeight)}`,
    `L ${formatNumber(topStartX)} ${formatNumber(safeHeight)}`,
    `C ${formatNumber(topStartX - handle)} ${formatNumber(safeHeight)} 0 ${formatNumber(rightEndY + handle)} 0 ${formatNumber(rightEndY)}`,
    `L 0 ${formatNumber(rightStartY)}`,
    `C 0 ${formatNumber(rightStartY - handle)} ${formatNumber(topStartX - handle)} 0 ${formatNumber(topStartX)} 0`,
    'Z',
  ];

  const path = pathSegments.join(' ');
  PATH_CACHE.set(cacheKey, path);
  return path;
}

export function clearSquirclePathCache(): void {
  PATH_CACHE.clear();
}
