import type { Approach, Idea } from '../../../shared/spec';
import { frame, palette, text, type Color } from '../core/plan';

// Preserve the approach colors from the original plugin. Wireframes stay greyscale.
export const approachColors: Record<Approach, Color> = {
  mobile: { r: 0.4, g: 0.6, b: 1 }, web: { r: 0.5, g: 0.8, b: 0.5 },
  dashboard: { r: 0.6, g: 0.4, b: 0.8 }, onboarding: { r: 1, g: 0.6, b: 0.4 },
  feature: { r: 1, g: 0.8, b: 0.3 },
};

export function planIdeaCard(idea: Idea, width: number) {
  const inner = width - 40;
  return frame(`Idea card: ${idea.title}`, width, [
    frame('Approach tag', 130, [text(idea.approach.toUpperCase(), 110, { bold: true, size: 11 })], {
      padding: 10, fill: approachColors[idea.approach], radius: 4,
    }),
    text(idea.title, inner, { bold: true, size: 22 }),
    text('RATIONALE', inner, { bold: true, size: 10, fill: palette.mid }),
    text(idea.rationale, inner),
    text('FIGMA MAKE PROMPT', inner, { bold: true, size: 10, fill: palette.mid }),
    text(idea.makePrompt, inner, { size: 13 }),
  ], { padding: 20, gap: 12, fill: palette.white, stroke: palette.light, radius: 8 });
}
