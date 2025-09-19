export type SquircleCornerRadii = {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

/**
 * Generate a squircle path using the superellipse formula:
 * |x/a|^n + |y/b|^n = 1
 *
 * - width, height: shape size
 * - radius: optional scaling factor
 * - smoothing: controls exponent n (0.55–0.65 = pillowy M! style, 0.9+ = boxier)
 */
export function getSquirclePath(
  width: number,
  height: number,
  radius: number = 20,
  smoothing: number = 0.6,
  _cornerRadii?: SquircleCornerRadii,
): string {
  void radius;
  const a = width / 2;
  const b = height / 2;

  // Convert smoothing into exponent n
  const clampedSmoothing = Math.min(Math.max(smoothing, 0), 0.99);
  const n = 2 / (1 - clampedSmoothing); // smoothing=0.6 → n≈5

  const steps = 128;
  const points: [number, number][] = [];

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const x = a * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n);
    const y = b * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n);

    points.push([x + a, y + b]);
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0]} ${points[i][1]}`;
  }
  d += ' Z';

  return d;
}
