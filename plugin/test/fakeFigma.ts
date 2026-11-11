import { vi } from 'vitest';

export class FakeNode {
  children: FakeNode[] = [];
  parent: FakeNode | null = null;
  removed = false;
  name = '';
  x = 0; y = 0;
  private fixedWidth = 100;
  private fixedHeight = 100;
  minHeight: number | null = null;
  fills: unknown[] = []; strokes: unknown[] = [];
  layoutMode = 'NONE';
  primaryAxisSizingMode = 'FIXED'; counterAxisSizingMode = 'FIXED';
  primaryAxisAlignItems = 'MIN'; counterAxisAlignItems = 'MIN';
  paddingTop = 0; paddingBottom = 0; paddingLeft = 0; paddingRight = 0; itemSpacing = 0;
  cornerRadius = 0; clipsContent = false; strokeWeight = 1;
  fontName = { family: 'Inter', style: 'Regular' }; fontSize = 14;
  textAutoResize = 'NONE'; textAlignHorizontal = 'LEFT'; lineHeight: unknown;
  private value = '';
  constructor(public readonly type: string, public readonly id: string, private loaded: Set<string>) {}
  set characters(value: string) {
    if (!this.loaded.has(this.fontName.style)) throw new Error('Font must be loaded before writing text');
    this.value = value;
  }
  get characters() { return this.value; }
  get width() { return this.fixedWidth; }
  get height(): number {
    if (this.type === 'TEXT' && this.textAutoResize === 'HEIGHT') {
      return Math.max(1, Math.ceil(this.value.length / Math.max(1, Math.floor(this.width / (this.fontSize * 0.6))))) * this.fontSize * 1.4;
    }
    const auto = this.layoutMode === 'VERTICAL' ? this.primaryAxisSizingMode === 'AUTO' :
      this.layoutMode === 'HORIZONTAL' && this.counterAxisSizingMode === 'AUTO';
    if (!auto) return this.fixedHeight;
    const content = this.layoutMode === 'VERTICAL' ? this.children.reduce((sum, n) => sum + n.height, 0) +
      Math.max(0, this.children.length - 1) * this.itemSpacing : Math.max(0, ...this.children.map(n => n.height));
    return Math.max(1, this.minHeight ?? 0, this.paddingTop + this.paddingBottom + content);
  }
  get absoluteBoundingBox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  resize(width: number, height: number) { this.fixedWidth = width; this.fixedHeight = height; }
  resizeWithoutConstraints(width: number, height: number) { this.resize(width, height); }
  appendChild(child: FakeNode) {
    if (child.parent) child.parent.children = child.parent.children.filter(n => n !== child);
    this.children.push(child); child.parent = this;
  }
  remove() {
    this.removed = true;
    for (const child of [...this.children]) child.remove();
    if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this);
  }
}
export function fakeFigma() {
  const loaded = new Set<string>();
  const page = new FakeNode('PAGE', 'page:1', loaded); page.name = 'Ideas';
  let count = 0;
  const make = (type: string) => { const node = new FakeNode(type, `1:${++count}`, loaded); page.appendChild(node); return node; };
  const fake = {
    currentPage: page, root: { name: 'Budget playground' },
    createFrame: vi.fn(() => make('FRAME')), createRectangle: vi.fn(() => make('RECTANGLE')),
    createText: vi.fn(() => make('TEXT')), createSection: vi.fn(() => make('SECTION')),
    loadFontAsync: vi.fn(async (font: { style: string }) => { loaded.add(font.style); }),
    viewport: { scrollAndZoomIntoView: vi.fn() },
    showUI: vi.fn(), notify: vi.fn(),
    ui: { onmessage: undefined as undefined | ((message: unknown) => Promise<void>), postMessage: vi.fn() },
  };
  return { fake, api: fake as unknown as PluginAPI };
}
export const descendants = (node: FakeNode): FakeNode[] => [node, ...node.children.flatMap(descendants)];
