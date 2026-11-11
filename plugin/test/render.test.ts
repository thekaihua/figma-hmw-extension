import { expect, test } from 'vitest';
import { idea, spec } from '../../shared/fixtures';
import { planScreen } from '../src/core/plan';
import { applyTree } from '../src/render/apply';
import { approachColors, planIdeaCard } from '../src/render/ideaCard';
import { renderIdeas } from '../src/render/section';
import { descendants, fakeFigma } from './fakeFigma';

test('applies editable nodes with auto layout and loads fonts before text', async () => {
  const { fake, api } = fakeFigma();
  await applyTree(api, planScreen({ name: 'Form', platform: 'mobile', root: {
    type: 'stack', children: [{ type: 'button', label: 'Save' }, { type: 'divider' }],
  } }));
  const root = fake.currentPage.children[0];
  expect(root).toMatchObject({ type: 'FRAME', width: 375, layoutMode: 'VERTICAL', primaryAxisSizingMode: 'AUTO', counterAxisSizingMode: 'FIXED' });
  expect(descendants(root).some(n => n.type === 'TEXT' && n.characters === 'Save')).toBe(true);
  expect(descendants(root).some(n => n.type === 'RECTANGLE')).toBe(true);
  expect(fake.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
  expect(fake.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Bold' });
});
test('idea cards contain the brief, rationale, title and original approach color', async () => {
  const { fake, api } = fakeFigma();
  await applyTree(api, planIdeaCard(idea, 375));
  const nodes = descendants(fake.currentPage.children[0]);
  const texts = nodes.filter(n => n.type === 'TEXT').map(n => n.characters);
  for (const value of [idea.title, idea.rationale, idea.makePrompt, 'MOBILE', 'FIGMA MAKE PROMPT']) expect(texts).toContain(value);
  expect(nodes.find(n => n.name === 'Approach tag')?.fills).toEqual([{ type: 'SOLID', color: approachColors.mobile }]);
  expect(approachColors.mobile).toEqual({ r: 0.4, g: 0.6, b: 1 });
});
test('renders a Section with cards and 1–3 screens and scrolls it into view', async () => {
  const { fake, api } = fakeFigma();
  const existing = fake.createFrame(); existing.x = 600; existing.resize(1200, 500);
  const second = { ...idea, title: 'Desk view', screens: [
    { ...idea.screens[0], platform: 'desktop' as const }, idea.screens[0], idea.screens[0],
  ] };
  const result = await renderIdeas(api, { ...spec, ideas: [idea, second] });
  const section = fake.currentPage.children.find(n => n.type === 'SECTION')!;
  expect(section.name).toBe(spec.hmw); expect(section.x).toBeGreaterThan(1800);
  expect(section.children).toHaveLength(2);
  expect(section.children[1].children).toHaveLength(4);
  expect(result).toMatchObject({ sectionId: section.id, ideaCount: 2, screenCount: 4 });
  expect(result.frames[1].screenIds).toHaveLength(3);
  expect(fake.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([section]);
  expect(fake.currentPage.children).toHaveLength(2);
});
test('cleans up a failed render and preserves existing content', async () => {
  const { fake, api } = fakeFigma(); const existing = fake.createFrame();
  fake.createText.mockImplementationOnce(() => { throw new Error('Text creation failed'); });
  await expect(renderIdeas(api, spec)).rejects.toThrow('Text creation failed');
  expect(fake.currentPage.children).toEqual([existing]);
});
test('long image labels grow their placeholder so visible text cannot overlap the next row', async () => {
  const { fake, api } = fakeFigma();
  const { planNode } = await import('../src/core/plan');
  await applyTree(api, planNode({ type: 'image', label: 'A long image description '.repeat(8) }, 100));
  expect(fake.currentPage.children[0].height).toBeGreaterThan(160);
});
