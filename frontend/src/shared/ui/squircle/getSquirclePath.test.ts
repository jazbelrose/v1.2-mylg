import { describe, expect, it } from 'vitest';

import { getSquirclePath } from './getSquirclePath';

function extractPoints(path: string): Array<[number, number]> {
  const matches = path.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const numbers = matches.map(Number);
  const points: Array<[number, number]> = [];

  for (let i = 0; i < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];

    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }

  return points;
}

describe('getSquirclePath', () => {
  it('generates a closed superellipse path for the given dimensions', () => {
    const path = getSquirclePath(200, 120, 20, 0.6);
    const points = extractPoints(path);

    expect(points).toHaveLength(128);
    expect(points[0][0]).toBeCloseTo(200, 3);
    expect(points[0][1]).toBeCloseTo(60, 3);
    expect(points[32][0]).toBeCloseTo(100, 3);
    expect(points[32][1]).toBeCloseTo(120, 3);
    expect(points[64][0]).toBeCloseTo(0, 3);
    expect(points[64][1]).toBeCloseTo(60, 3);
    expect(points[96][0]).toBeCloseTo(100, 3);
    expect(points[96][1]).toBeCloseTo(0, 3);
    expect(path.endsWith(' Z')).toBe(true);
  });

  it('adjusts curvature when smoothing changes', () => {
    const pillowy = extractPoints(getSquirclePath(200, 120, 20, 0.6));
    const boxier = extractPoints(getSquirclePath(200, 120, 20, 0.95));

    const fortyFiveDegreesIndex = 16; // 45° around the superellipse

    expect(boxier[fortyFiveDegreesIndex][0]).toBeGreaterThan(
      pillowy[fortyFiveDegreesIndex][0],
    );
    expect(boxier[fortyFiveDegreesIndex][1]).toBeGreaterThan(
      pillowy[fortyFiveDegreesIndex][1],
    );
  });

  it('supports non-square dimensions', () => {
    const path = getSquirclePath(120, 60, 20, 0.6);
    const points = extractPoints(path);

    expect(points[0][0]).toBeCloseTo(120, 3);
    expect(points[0][1]).toBeCloseTo(30, 3);
    expect(points[32][0]).toBeCloseTo(60, 3);
    expect(points[32][1]).toBeCloseTo(60, 3);
  });
});
