/**
 * Pure luma-plane metrics. Each function carries the 'worklet' directive so
 * the capture hook can call it from the frame worklet; under jest the
 * directive is inert and the functions run as plain JS.
 */

export interface LumaPlane {
  data: Uint8Array;
  width: number;
  height: number;
  bytesPerRow: number;
}

/** Variance of the 3x3 Laplacian over sampled pixels; low means blurred. */
export function laplacianVariance(plane: LumaPlane, stride: number): number {
  'worklet';
  const { data, width, height, bytesPerRow } = plane;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += stride) {
    const row = y * bytesPerRow;
    for (let x = 1; x < width - 1; x += stride) {
      const index = row + x;
      const lap =
        4 * data[index] -
        data[index - 1] -
        data[index + 1] -
        data[index - bytesPerRow] -
        data[index + bytesPerRow];
      sum += lap;
      sumSquares += lap * lap;
      count += 1;
    }
  }
  if (count === 0) {
    return 0;
  }
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

/** Fraction of sampled pixels at or above the clip level. */
export function clippedFraction(plane: LumaPlane, clipLevel: number, stride: number): number {
  'worklet';
  const { data, width, height, bytesPerRow } = plane;
  let clipped = 0;
  let count = 0;
  for (let y = 0; y < height; y += stride) {
    const row = y * bytesPerRow;
    for (let x = 0; x < width; x += stride) {
      if (data[row + x] >= clipLevel) {
        clipped += 1;
      }
      count += 1;
    }
  }
  return count === 0 ? 0 : clipped / count;
}

/** Mean luma per cell of a gridSize x gridSize grid, row-major. */
export function lumaGrid(plane: LumaPlane, gridSize: number, stride: number): number[] {
  'worklet';
  const { data, width, height, bytesPerRow } = plane;
  const sums = new Array<number>(gridSize * gridSize).fill(0);
  const counts = new Array<number>(gridSize * gridSize).fill(0);
  for (let y = 0; y < height; y += stride) {
    const cellY = Math.min(gridSize - 1, Math.floor((y * gridSize) / height));
    const row = y * bytesPerRow;
    for (let x = 0; x < width; x += stride) {
      const cellX = Math.min(gridSize - 1, Math.floor((x * gridSize) / width));
      const cell = cellY * gridSize + cellX;
      sums[cell] += data[row + x];
      counts[cell] += 1;
    }
  }
  return sums.map((cellSum, index) => (counts[index] === 0 ? 0 : cellSum / counts[index]));
}

/** Mean absolute difference between two luma grids; high means fast motion. */
export function gridDelta(previous: number[], current: number[]): number {
  'worklet';
  const length = Math.min(previous.length, current.length);
  if (length === 0) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += Math.abs(previous[index] - current[index]);
  }
  return total / length;
}
