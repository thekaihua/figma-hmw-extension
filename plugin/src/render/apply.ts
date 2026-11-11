import type { Primitive } from '../core/plan';

export const fonts = [{ family: 'Inter', style: 'Regular' }, { family: 'Inter', style: 'Bold' }];
export async function loadFonts(api: PluginAPI) { await Promise.all(fonts.map(font => api.loadFontAsync(font))); }
const paint = (color: RGB): SolidPaint[] => [{ type: 'SOLID', color }];

// Call after loadFonts. Parenting immediately lets a failed batch be removed as a unit.
export function applyPrimitive(api: PluginAPI, primitive: Primitive, parent?: ChildrenMixin): FrameNode | TextNode | RectangleNode {
  if (primitive.kind === 'text') {
    const node = api.createText(); parent?.appendChild(node);
    node.name = primitive.name;
    node.fontName = { family: 'Inter', style: primitive.bold ? 'Bold' : 'Regular' };
    node.fontSize = primitive.size;
    node.resize(primitive.width, 1);
    node.textAutoResize = 'HEIGHT';
    node.textAlignHorizontal = primitive.align ?? 'LEFT';
    node.lineHeight = { unit: 'PERCENT', value: 140 };
    node.fills = paint(primitive.fill ?? { r: 0.18, g: 0.18, b: 0.18 });
    node.characters = primitive.text;
    return node;
  }
  if (primitive.kind === 'rectangle') {
    const node = api.createRectangle(); parent?.appendChild(node);
    node.name = primitive.name; node.resize(primitive.width, primitive.height);
    node.fills = primitive.fill ? paint(primitive.fill) : [];
    node.cornerRadius = primitive.radius ?? 0;
    return node;
  }
  const node = api.createFrame(); parent?.appendChild(node);
  node.name = primitive.name; node.clipsContent = false;
  node.fills = primitive.fill ? paint(primitive.fill) : [];
  node.strokes = primitive.stroke ? paint(primitive.stroke) : [];
  node.cornerRadius = primitive.radius ?? 0;
  node.layoutMode = primitive.layout;
  node.resize(primitive.width, primitive.height ?? 1);
  node.minHeight = primitive.minHeight ?? null;
  node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = primitive.padding;
  node.itemSpacing = primitive.gap;
  node.primaryAxisSizingMode = primitive.layout === 'VERTICAL' && primitive.height === undefined ? 'AUTO' : 'FIXED';
  node.counterAxisSizingMode = primitive.layout === 'HORIZONTAL' && primitive.height === undefined ? 'AUTO' : 'FIXED';
  node.primaryAxisAlignItems = primitive.justify ?? 'MIN';
  node.counterAxisAlignItems = primitive.align ?? 'MIN';
  for (const child of primitive.children) applyPrimitive(api, child, node);
  return node;
}

export async function applyTree(api: PluginAPI, primitive: Primitive, parent?: ChildrenMixin) {
  await loadFonts(api); return applyPrimitive(api, primitive, parent);
}
