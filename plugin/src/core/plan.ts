import type { Screen, WireNode } from '../../../shared/spec';

export interface Color { r: number; g: number; b: number }
export const grey = (value: number): Color => ({ r: value, g: value, b: value });
export const palette = { white: grey(1), paper: grey(0.97), light: grey(0.9), mid: grey(0.65), ink: grey(0.18) };
interface Base { name: string; width: number; fill?: Color }
export interface PrimitiveText extends Base {
  kind: 'text'; text: string; size: number; bold?: boolean; align?: 'LEFT' | 'CENTER' | 'RIGHT';
}
export interface PrimitiveRectangle extends Base { kind: 'rectangle'; height: number; radius?: number }
export interface PrimitiveFrame extends Base {
  kind: 'frame'; layout: 'VERTICAL' | 'HORIZONTAL'; padding: number; gap: number;
  children: Primitive[]; height?: number; minHeight?: number; stroke?: Color; radius?: number;
  align?: 'MIN' | 'CENTER' | 'MAX'; justify?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
}
export type Primitive = PrimitiveText | PrimitiveRectangle | PrimitiveFrame;
export const screenWidths: Record<Screen['platform'], number> = { mobile: 375, tablet: 768, desktop: 1280 };

export function text(value: string, width: number, options: Partial<PrimitiveText> = {}): PrimitiveText {
  return { kind: 'text', name: 'Text', text: value, width: Math.max(1, width), size: 14, fill: palette.ink, ...options };
}
export function frame(name: string, width: number, children: Primitive[], options: Partial<PrimitiveFrame> = {}): PrimitiveFrame {
  return { kind: 'frame', name, width: Math.max(1, width), layout: 'VERTICAL', padding: 0, gap: 12, children, ...options };
}
function box(name: string, label: string, width: number, options: Partial<PrimitiveFrame> = {}): PrimitiveFrame {
  const padding = Math.min(12, width / 4);
  return frame(name, width, [text(label, width - padding * 2)], { padding, fill: palette.paper, radius: 6, ...options });
}

export function planNode(node: WireNode, availableWidth: number): Primitive {
  const width = Math.max(1, availableWidth);
  const label = node.label ?? node.type;
  const padding = Math.min(node.padding ?? 16, width / 4);
  const inner = width - padding * 2;
  switch (node.type) {
    case 'stack': {
      const children = node.children ?? [];
      const horizontal = node.direction === 'horizontal';
      const gap = Math.min(node.gap ?? 12, inner / Math.max(1, children.length * 2));
      const childWidth = horizontal ? Math.max(1, (inner - gap * (children.length - 1)) / Math.max(1, children.length)) : inner;
      return frame('Stack', width, children.map(child => planNode(child, childWidth)), {
        layout: horizontal ? 'HORIZONTAL' : 'VERTICAL', padding, gap,
      });
    }
    case 'text': return text(node.text ?? '', width);
    case 'button': return frame('Button', width, [text(label, inner, { bold: true, fill: palette.white, align: 'CENTER' })], {
      padding, fill: palette.ink, radius: 8, align: 'CENTER', justify: 'CENTER',
    });
    case 'input': return frame('Input', width, [text(label, width, { bold: true, size: 12 }),
      box('Input field', node.placeholder || 'Enter a value…', width, { stroke: palette.mid, fill: palette.white })], { gap: 6 });
    case 'image': return frame('Image', width, [text('×', inner, { size: 48, align: 'CENTER', fill: palette.mid }),
      text(label, inner, { align: 'CENTER', size: 12 })], {
      padding, gap: 4, minHeight: 160, fill: palette.light, radius: 4, align: 'CENTER', justify: 'CENTER',
    });
    case 'card': return frame('Card', width, [text(label, inner, { bold: true }),
      ...(node.children ?? []).map(child => planNode(child, inner))], { padding, radius: 8, fill: palette.white, stroke: palette.light });
    case 'list': return frame('List', width, (node.items ?? []).map((item, i) =>
      box(`List row ${i + 1}`, item, width, { stroke: palette.light, fill: palette.white })), { gap: 4 });
    case 'navbar': return box('Navbar', `‹   ${label}   ···`, width, { fill: palette.light });
    case 'tabbar': {
      const items = node.items ?? [];
      const itemWidth = width / Math.max(1, items.length);
      return frame('Tabbar', width, items.map(item => text(item, itemWidth, { size: 12, align: 'CENTER' })), {
        layout: 'HORIZONTAL', padding: 0, gap: 0, fill: palette.light,
      });
    }
    case 'chip': return box('Chip', label, width, { radius: 16, fill: palette.light });
    case 'toggle': return box('Toggle', `${label}    ${node.checked ? '● On' : '○ Off'}`, width, { stroke: palette.light });
    case 'avatar': {
      const size = Math.min(48, width);
      const words = label.trim().split(/\s+/);
      const initials = (words.length === 1 ? label.slice(0, 2) : words.slice(0, 2).map(word => word[0]).join('')).toUpperCase();
      return frame(`Avatar: ${label}`, size, [text(initials, size, { size: 12, bold: true, align: 'CENTER' })], {
        height: size, fill: palette.light, radius: size / 2, justify: 'CENTER', align: 'CENTER',
      });
    }
    case 'divider': return { kind: 'rectangle', name: 'Divider', width, height: 1, fill: palette.light };
    case 'chart': {
      const values = node.values ?? [];
      const gap = Math.min(8, inner / Math.max(1, values.length * 2));
      const barWidth = Math.max(1, (inner - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));
      const bars = values.map((value, i): PrimitiveRectangle => ({ kind: 'rectangle', name: `Chart bar ${i + 1}: ${value}`,
        width: barWidth, height: Math.max(2, value * 1.2), fill: palette.mid, radius: 2 }));
      return frame('Chart', width, [text(label, inner, { bold: true, size: 12 }),
        frame('Chart bars', inner, bars, { layout: 'HORIZONTAL', align: 'MAX', height: 120, gap })], { padding, fill: palette.paper });
    }
    case 'note': return box('Note', node.text ?? '', width, { stroke: palette.mid, fill: palette.paper });
    default: return box(`Unsupported: ${node.type}`, `${node.type}: ${label}`, width, { fill: palette.light, stroke: palette.mid });
  }
}

export function planScreen(screen: Screen): PrimitiveFrame {
  const width = screenWidths[screen.platform];
  return frame(screen.name, width, [text(`${screen.name} · ${screen.platform}`, width - 40, { size: 12, bold: true, fill: palette.mid }),
    planNode(screen.root, width - 40)], { padding: 20, gap: 24, fill: palette.white, stroke: palette.light, radius: 12 });
}
