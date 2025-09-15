import { describe, it, expect } from 'vitest';
import { getSquirclePath } from './getSquirclePath';

describe('getSquirclePath', () => {
  it('generates a valid SVG path for basic dimensions', () => {
    const path = getSquirclePath(100, 60, 20, 0.6);
    
    // Should start with M (move to) and end with Z (close path)
    expect(path).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)?/);
    expect(path).toMatch(/Z$/);
    
    // Should contain cubic bezier curves (C commands)
    expect(path).toContain('C ');
    
    // Should contain line commands (L commands)
    expect(path).toContain('L ');
  });

  it('respects maximum radius constraint', () => {
    // For a 40x40 square, max radius should be 20
    const pathLarge = getSquirclePath(40, 40, 30, 0.6);
    const pathExact = getSquirclePath(40, 40, 20, 0.6);
    
    // Both should be equivalent since 30 gets clamped to 20
    expect(pathLarge).toBe(pathExact);
  });

  it('handles zero radius gracefully', () => {
    const path = getSquirclePath(100, 60, 0, 0.6);
    
    // Should return a simple rectangle path
    expect(path).toBe('M 0 0 L 100 0 L 100 60 L 0 60 Z');
  });

  it('handles zero dimensions gracefully', () => {
    const pathZeroWidth = getSquirclePath(0, 60, 20, 0.6);
    const pathZeroHeight = getSquirclePath(100, 0, 20, 0.6);
    
    expect(pathZeroWidth).toBe('M 0 0 L 0 0 L 0 60 L 0 60 Z');
    expect(pathZeroHeight).toBe('M 0 0 L 100 0 L 100 0 L 0 0 Z');
  });

  it('clamps smoothing factor to valid range', () => {
    const pathNegative = getSquirclePath(100, 60, 20, -0.5);
    const pathZero = getSquirclePath(100, 60, 20, 0);
    const pathOverMax = getSquirclePath(100, 60, 20, 1.5);
    const pathOne = getSquirclePath(100, 60, 20, 1);
    
    // Negative smoothing should be treated as 0
    expect(pathNegative).toBe(pathZero);
    
    // Over 1 smoothing should be treated as 1
    expect(pathOverMax).toBe(pathOne);
  });

  it('generates different paths for different smoothing values', () => {
    const pathSharp = getSquirclePath(100, 60, 20, 0);
    const pathSmooth = getSquirclePath(100, 60, 20, 1);
    
    // Different smoothing should produce different paths
    expect(pathSharp).not.toBe(pathSmooth);
  });

  it('handles square vs rectangular dimensions', () => {
    const pathSquare = getSquirclePath(100, 100, 20, 0.6);
    const pathRect = getSquirclePath(100, 60, 20, 0.6);
    
    // Different aspect ratios should produce different paths
    expect(pathSquare).not.toBe(pathRect);
    
    // Both should be valid paths
    expect(pathSquare).toMatch(/^M .* Z$/);
    expect(pathRect).toMatch(/^M .* Z$/);
  });

  it('uses default parameters when not provided', () => {
    const pathDefault = getSquirclePath(100, 60);
    const pathExplicit = getSquirclePath(100, 60, 20, 0.6);
    
    // Default parameters should match explicit ones
    expect(pathDefault).toBe(pathExplicit);
  });

  it('generates mathematically correct corner positions', () => {
    const path = getSquirclePath(100, 60, 20, 0.6);
    
    // For 100x60 with radius 20, top-right corner should be at x=80
    expect(path).toContain('L 80 0');
    
    // Right edge should go to height-radius = 40
    expect(path).toContain('L 100 40');
    
    // Bottom edge should include left corner at x=20
    expect(path).toContain('L 20 60');
    
    // Left edge should go to radius = 20
    expect(path).toContain('L 0 20');
  });
});