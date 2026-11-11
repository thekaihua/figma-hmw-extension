export interface Size { width: number; height: number }
export interface Bounds extends Size { x: number; y: number }
export const GRID_GAP = 80;
export const SECTION_PADDING = 48;

export function placementOrigin(bounds: readonly Bounds[]) {
  if (!bounds.length) return { x: 0, y: 0 };
  return { x: Math.max(...bounds.map(b => b.x + b.width)) + 160, y: Math.min(...bounds.map(b => b.y)) };
}

export function gridLayout(sizes: readonly Size[]) {
  const positions: { x: number; y: number }[] = [];
  let y = SECTION_PADDING;
  let width = SECTION_PADDING * 2;
  for (let start = 0; start < sizes.length; start += 4) {
    let x = SECTION_PADDING;
    let rowHeight = 0;
    const row = sizes.slice(start, start + 4);
    for (const size of row) {
      positions.push({ x, y }); x += size.width + GRID_GAP;
      rowHeight = Math.max(rowHeight, size.height);
    }
    width = Math.max(width, x - GRID_GAP + SECTION_PADDING);
    y += rowHeight + GRID_GAP;
  }
  return { positions, width, height: Math.max(SECTION_PADDING * 2, y - GRID_GAP + SECTION_PADDING) };
}
