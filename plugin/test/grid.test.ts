import { expect, test } from 'vitest';
import { gridLayout, placementOrigin } from '../src/core/grid';

test('wraps after at most four ideas and accounts for the tallest row', () => {
  const sizes = Array.from({ length: 9 }, (_, i) => ({ width: 375, height: i === 2 ? 1500 : 600 }));
  const { positions } = gridLayout(sizes);
  expect(new Set(positions.slice(0, 4).map(p => p.y)).size).toBe(1);
  expect(positions[4].y).toBeGreaterThanOrEqual(positions[2].y + sizes[2].height);
  expect(positions[8].y).toBeGreaterThan(positions[4].y);
});
test('places an empty page at zero and all other content to the right', () => {
  expect(placementOrigin([])).toEqual({ x: 0, y: 0 });
  const origin = placementOrigin([{ x: -500, y: -300, width: 100, height: 800 }, { x: 200, y: 100, width: 1280, height: 600 }]);
  expect(origin.x).toBeGreaterThan(1480); expect(origin.y).toBe(-300);
});
test('columns never overlap for mixed platforms, counts and heights', () => {
  for (let count = 1; count <= 15; count++) {
    const sizes = Array.from({ length: count }, (_, i) => ({ width: [375, 768, 1280][i % 3], height: 700 + i * 90 }));
    const { positions, width, height } = gridLayout(sizes);
    positions.forEach((a, i) => {
      expect(a.x + sizes[i].width).toBeLessThanOrEqual(width);
      expect(a.y + sizes[i].height).toBeLessThanOrEqual(height);
      positions.slice(i + 1).forEach((b, offset) => {
        const j = i + offset + 1;
        expect(a.x + sizes[i].width <= b.x || b.x + sizes[j].width <= a.x || a.y + sizes[i].height <= b.y || b.y + sizes[j].height <= a.y).toBe(true);
      });
    });
  }
});
