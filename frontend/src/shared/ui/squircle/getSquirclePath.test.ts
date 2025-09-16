import { describe, expect, it, beforeEach } from 'vitest';

import { clearSquirclePathCache, getSquirclePath } from './getSquirclePath';

describe('getSquirclePath', () => {
  beforeEach(() => {
    clearSquirclePathCache();
  });

  it('creates a rounded path for default radius and smoothing', () => {
    const path = getSquirclePath(200, 120, 20, 0.6);

    expect(path).toMatchInlineSnapshot(
      '"M 20 0 L 180 0 C 196.4183 0 200 3.5817 200 20 L 200 100 C 200 116.4183 196.4183 120 180 120 L 20 120 C 3.5817 120 0 116.4183 0 100 L 0 20 C 0 3.5817 3.5817 0 20 0 Z"',
    );
  });

  it('clamps radius when larger than half the dimension', () => {
    const path = getSquirclePath(60, 40, 80, 0.6);

    expect(path).toMatchInlineSnapshot(
      '"M 20 0 L 40 0 C 56.4183 0 60 3.5817 60 20 L 60 20 C 60 36.4183 56.4183 40 40 40 L 20 40 C 3.5817 40 0 36.4183 0 20 L 0 20 C 0 3.5817 3.5817 0 20 0 Z"',
    );
  });

  it('falls back to rectangle when radius is zero', () => {
    const path = getSquirclePath(100, 50, 0, 0.6);

    expect(path).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
  });

  it('returns cached value on repeated calls', () => {
    const pathA = getSquirclePath(150, 90, 16, 0.4);
    const pathB = getSquirclePath(150, 90, 16, 0.4);

    expect(pathA).toBe(pathB);
  });
});
