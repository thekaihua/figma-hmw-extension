import { describe, expect, test } from 'vitest';
import { nodeTypes, validateSpec } from '../../shared/spec';
import { idea, spec } from '../../shared/fixtures';

describe('wireframe spec', () => {
  test('accepts a minimal idea and every node type', () => {
    expect(validateSpec(spec).success).toBe(true);
    const nodes = [
      { type: 'stack', children: [] }, { type: 'text', text: 'Hello' },
      { type: 'button', label: 'Continue' }, { type: 'input', label: 'Email' },
      { type: 'image', label: 'Photo' }, { type: 'card', label: 'Balance', children: [] },
      { type: 'list', items: ['One', 'Two'] }, { type: 'navbar', label: 'Home' },
      { type: 'tabbar', items: ['Home', 'Me'] }, { type: 'chip', label: 'New' },
      { type: 'toggle', label: 'Alerts', checked: true }, { type: 'avatar', label: 'JD' },
      { type: 'divider' }, { type: 'chart', label: 'Spending', values: [20, 60] },
      { type: 'note', text: 'Try this' },
    ];
    expect(nodes.map(n => n.type)).toEqual(nodeTypes);
    expect(validateSpec({ ...spec, ideas: [{ ...idea, screens: [
      { name: 'All nodes', platform: 'desktop', root: { type: 'stack', children: nodes } },
    ] }] }).success).toBe(true);
  });

  test.each([
    ['unknown approach', { ...idea, approach: 'service' }],
    ['zero screens', { ...idea, screens: [] }],
    ['four screens', { ...idea, screens: Array(4).fill(idea.screens[0]) }],
    ['missing rationale', { ...idea, rationale: undefined }],
  ])('rejects %s', (_, value) => {
    expect(validateSpec({ ...spec, ideas: [value] }).success).toBe(false);
  });

  test('limits a batch to 1–15 ideas and requires the HMW', () => {
    for (const ideas of [[], Array(16).fill(idea)]) {
      expect(validateSpec({ ...spec, ideas }).success).toBe(false);
    }
    expect(validateSpec({ ideas: [idea] }).success).toBe(false);
  });

  test('limits nesting to six levels with the failing path', () => {
    let root: unknown = { type: 'text', text: 'Deep' };
    for (let i = 0; i < 5; i++) root = { type: 'stack', children: [root] };
    expect(validateSpec({ ...spec, ideas: [{ ...idea, screens: [{ ...idea.screens[0], root }] }] }).success).toBe(true);
    root = { type: 'stack', children: [root] };
    const result = validateSpec({ ...spec, ideas: [{ ...idea, screens: [{ ...idea.screens[0], root }] }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join()).toContain('root.children[0].children[0]');
  });

  test('returns actionable paths for missing node fields', () => {
    const invalid = { ...idea, screens: [{ ...idea.screens[0], root: {
      type: 'stack', children: [{ type: 'divider' }, { type: 'button' }],
    } }] };
    const result = validateSpec({ ...spec, ideas: [idea, idea, invalid] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join()).toContain('ideas[2].screens[0].root.children[1].label');
  });

  test('accepts unknown types and marks them for fallback', () => {
    const result = validateSpec({ ...spec, ideas: [{ ...idea, screens: [{ ...idea.screens[0], root: { type: 'map', label: 'Area' } }] }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ideas[0].screens[0].root.fallback).toBe(true);
    expect(validateSpec({ ...spec, ideas: [{ ...idea, screens: [{ ...idea.screens[0], root: { type: 'constructor' } }] }] }).success).toBe(true);
  });
});
