import { describe, expect, it } from '@jest/globals';

import { clippedFraction, gridDelta, laplacianVariance, lumaGrid } from '../metrics';

function plane(width: number, height: number, fill: (x: number, y: number) => number) {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] = fill(x, y);
    }
  }
  return { data, width, height, bytesPerRow: width };
}

describe('laplacianVariance', () => {
  it('reads a flat frame as zero variance', () => {
    expect(laplacianVariance(plane(64, 64, () => 128), 1)).toBe(0);
  });

  it('reads a checkerboard as far sharper than a smooth gradient', () => {
    const checker = plane(64, 64, (x, y) => ((x + y) % 2 === 0 ? 0 : 255));
    const gradient = plane(64, 64, (x) => Math.round((x / 63) * 255));
    expect(laplacianVariance(checker, 1)).toBeGreaterThan(
      laplacianVariance(gradient, 1) * 100,
    );
  });
});

describe('clippedFraction', () => {
  it('counts the clipped half of a frame', () => {
    const half = plane(64, 64, (x) => (x < 32 ? 255 : 0));
    expect(clippedFraction(half, 250, 1)).toBeCloseTo(0.5);
  });

  it('reads a dark frame as unclipped', () => {
    expect(clippedFraction(plane(64, 64, () => 40), 250, 1)).toBe(0);
  });
});

describe('lumaGrid and gridDelta', () => {
  it('reports zero delta for identical frames', () => {
    const grid = lumaGrid(plane(64, 64, (x) => x * 3), 8, 1);
    expect(gridDelta(grid, grid)).toBe(0);
  });

  it('reports a large delta when the scene shifts', () => {
    const left = lumaGrid(plane(64, 64, (x) => (x < 32 ? 255 : 0)), 8, 1);
    const right = lumaGrid(plane(64, 64, (x) => (x < 32 ? 0 : 255)), 8, 1);
    expect(gridDelta(left, right)).toBeGreaterThan(200);
  });

  it('splits the plane into gridSize^2 cell means', () => {
    const grid = lumaGrid(plane(64, 64, (x) => (x < 32 ? 0 : 200)), 8, 1);
    expect(grid).toHaveLength(64);
    expect(grid[0]).toBe(0);
    expect(grid[7]).toBe(200);
  });
});
