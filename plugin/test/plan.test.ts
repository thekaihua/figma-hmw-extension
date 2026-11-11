import { describe, expect, test } from 'vitest';
import { planNode, planScreen, type Primitive } from '../src/core/plan';
import type { WireNode } from '../../shared/spec';

function all(node: Primitive): Primitive[] { return [node, ...('children' in node ? node.children.flatMap(all) : [])]; }
const cases: WireNode[] = [
  { type: 'stack', children: [{ type: 'text', text: 'Child' }], direction: 'horizontal' },
  { type: 'text', text: 'Hello' }, { type: 'button', label: 'Save' },
  { type: 'input', label: 'Email', placeholder: 'you@example.com' },
  { type: 'image', label: 'Hero image' }, { type: 'card', label: 'Total', children: [{ type: 'text', text: '$42' }] },
  { type: 'list', items: ['One', 'Two', 'Three'] }, { type: 'navbar', label: 'Home' },
  { type: 'tabbar', items: ['Home', 'Profile'] }, { type: 'chip', label: 'New' },
  { type: 'toggle', label: 'Alerts', checked: true }, { type: 'avatar', label: 'JD' },
  { type: 'divider' }, { type: 'chart', label: 'Savings', values: [25, 80, 50] },
  { type: 'note', text: 'A rough annotation' },
];
describe('wireframe plans', () => {
  test.each(cases)('plans $type as editable primitives', node => {
    const tree = planNode(node, 320);
    expect(tree.name.toLowerCase()).toContain(node.type);
    const nodes = all(tree);
    expect(nodes.every(n => n.width > 0)).toBe(true);
    if (node.label) expect(JSON.stringify(nodes)).toContain(node.label);
    if (node.text) expect(JSON.stringify(nodes)).toContain(node.text);
    if (node.type === 'stack') expect(tree).toMatchObject({ layout: 'HORIZONTAL', children: [{ text: 'Child' }] });
    if (node.type === 'button') expect(tree).toMatchObject({ kind: 'frame', radius: 8, align: 'CENTER', children: [{ text: 'Save', align: 'CENTER' }] });
    if (node.type === 'text') expect(tree).toMatchObject({ kind: 'text', text: 'Hello', size: 14 });
    if (node.type === 'input') expect(tree).toMatchObject({ children: [{ text: 'Email' }, { name: 'Input field', children: [{ text: 'you@example.com' }] }] });
    if (node.type === 'card') expect(tree).toMatchObject({ radius: 8, children: [{ text: 'Total' }, { text: '$42' }] });
    if (node.type === 'navbar') expect(tree).toMatchObject({ children: [{ text: expect.stringContaining('‹') }] });
    if (node.type === 'tabbar') expect(tree).toMatchObject({ layout: 'HORIZONTAL', children: [{ text: 'Home' }, { text: 'Profile' }] });
    if (node.type === 'chip') expect(tree).toMatchObject({ radius: 16 });
    if (node.type === 'toggle') expect(tree).toMatchObject({ children: [{ text: 'Alerts    ● On' }] });
    if (node.type === 'avatar') expect(tree).toMatchObject({ radius: 24, width: 48, height: 48 });
    if (node.type === 'divider') expect(tree).toMatchObject({ kind: 'rectangle', height: 1 });
    if (node.type === 'note') expect(tree).toMatchObject({ children: [{ text: 'A rough annotation' }], stroke: expect.any(Object) });
    if (node.type === 'image') expect(JSON.stringify(tree)).toContain('×');
    if (node.type === 'list') expect('children' in tree && tree.children).toHaveLength(3);
    if (node.type === 'chart') expect(nodes.filter(n => n.kind === 'rectangle')).toHaveLength(3);
  });
  test.each([['mobile', 375], ['tablet', 768], ['desktop', 1280]] as const)('%s screens have %s width and auto height', (platform, width) => {
    const tree = planScreen({ name: 'Start', platform, root: { type: 'text', text: 'Hello' } });
    expect(tree.width).toBe(width); expect(tree.height).toBeUndefined(); expect(tree.layout).toBe('VERTICAL');
  });
  test('unknown nodes become labeled grey boxes without throwing', () => {
    expect(planNode({ type: 'map', label: 'Neighborhood', fallback: true }, 300)).toMatchObject({ kind: 'frame', name: 'Unsupported: map' });
    expect(JSON.stringify(planNode({ type: 'map' }, 300))).toContain('map');
  });
  test('avatars use initials and retain the full label in the layer name', () => {
    expect(planNode({ type: 'avatar', label: 'Jane Doe' }, 300)).toMatchObject({
      name: 'Avatar: Jane Doe', children: [{ text: 'JD' }],
    });
  });
  test('all wireframe paint colors are greyscale', () => {
    for (const tree of cases.map(node => planNode(node, 320))) for (const primitive of all(tree)) {
      for (const color of [primitive.fill, 'stroke' in primitive ? primitive.stroke : undefined]) {
        if (color) { expect(color.r).toBe(color.g); expect(color.g).toBe(color.b); }
      }
    }
  });
});
