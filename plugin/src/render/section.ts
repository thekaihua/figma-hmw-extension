import type { RenderIdeas } from '../../../shared/spec';
import type { RenderResult } from '../../../shared/protocol';
import { frame, grey, planScreen, screenWidths } from '../core/plan';
import { gridLayout, placementOrigin } from '../core/grid';
import { applyPrimitive, loadFonts } from './apply';
import { planIdeaCard } from './ideaCard';

export async function renderIdeas(api: PluginAPI, spec: RenderIdeas): Promise<RenderResult> {
  const page = api.currentPage;
  const bounds = page.children.map(node => node.absoluteBoundingBox ?? { x: node.x, y: node.y, width: node.width, height: node.height });
  const origin = placementOrigin(bounds);
  await loadFonts(api);
  const section = api.createSection();
  try {
    page.appendChild(section);
    section.name = spec.hmw;
    section.fills = [{ type: 'SOLID', color: grey(0.95) }];
    const columns = spec.ideas.map(idea => {
      const width = Math.max(...idea.screens.map(screen => screenWidths[screen.platform]));
      return applyPrimitive(api, frame(idea.title, width, [planIdeaCard(idea, width),
        ...idea.screens.map(planScreen)], { gap: 24 }), section) as FrameNode;
    });
    // Measure actual auto-layout heights after text wrapping, rather than estimating them.
    const grid = gridLayout(columns);
    section.resizeWithoutConstraints(grid.width, grid.height);
    section.x = origin.x; section.y = origin.y;
    columns.forEach((column, i) => { column.x = grid.positions[i].x; column.y = grid.positions[i].y; });
    const result: RenderResult = {
      sectionId: section.id, ideaCount: spec.ideas.length,
      screenCount: spec.ideas.reduce((count, idea) => count + idea.screens.length, 0),
      frames: columns.map((column, i) => ({ idea: spec.ideas[i].title, columnId: column.id,
        cardId: column.children[0].id, screenIds: column.children.slice(1).map(node => node.id) })),
    };
    api.viewport.scrollAndZoomIntoView([section]);
    return result;
  } catch (error) { section.remove(); throw error; }
}
