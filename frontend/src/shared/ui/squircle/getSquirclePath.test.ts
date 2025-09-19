import { describe, expect, it } from 'vitest';

import { getSquirclePath } from './getSquirclePath';

describe('getSquirclePath', () => {
  const extractPoints = (path: string): [number, number][] => {
    const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points: [number, number][] = [];

    for (let i = 0; i < numbers.length; i += 2) {
      points.push([numbers[i], numbers[i + 1]]);
    }

    return points;
  };

  it('creates a closed superellipse path for default smoothing', () => {
    const width = 200;
    const height = 120;
    const path = getSquirclePath(width, height, 20, 0.6);
    const points = extractPoints(path);

    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith(' Z')).toBe(true);
    expect(points).toHaveLength(128);

    const [startX, startY] = points[0];
    expect(startX).toBeCloseTo(width);
    expect(startY).toBeCloseTo(height / 2);

    const [quarterX, quarterY] = points[32];
    expect(quarterX).toBeCloseTo(width / 2);
    expect(quarterY).toBeCloseTo(height);
  });

  it('generates points within the provided bounds', () => {
    const width = 150;
    const height = 90;
    const path = getSquirclePath(width, height, 16, 0.6);
    const points = extractPoints(path);

    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(width);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(height);
  });

  it('adjusts curvature based on smoothing', () => {
    const soft = extractPoints(getSquirclePath(200, 120, 48, 0.6));
    const sharp = extractPoints(getSquirclePath(200, 120, 48, 0.9));

    const soft45 = soft[16];
    const sharp45 = sharp[16];

    expect(soft45[0]).toBeLessThan(sharp45[0]);
    expect(soft45[1]).toBeLessThan(sharp45[1]);
  });
});
