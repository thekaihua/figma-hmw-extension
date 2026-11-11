import { z } from 'zod';

// Figma's sandbox forbids dynamic code generation. Use Zod's interpreted parser.
z.config({ jitless: true });

export const nodeTypes = ['stack', 'text', 'button', 'input', 'image', 'card', 'list',
  'navbar', 'tabbar', 'chip', 'toggle', 'avatar', 'divider', 'chart', 'note'] as const;
export const approachSchema = z.enum(['mobile', 'web', 'dashboard', 'onboarding', 'feature']);
export type Approach = z.infer<typeof approachSchema>;

export interface WireNode {
  type: string;
  label?: string;
  text?: string;
  children?: WireNode[];
  direction?: 'vertical' | 'horizontal';
  gap?: number;
  padding?: number;
  items?: string[];
  placeholder?: string;
  checked?: boolean;
  values?: number[];
  fallback?: boolean;
}

// Bounded schemas reject deep input before descending further, including unknown types.
function nodeAtDepth(depth: number): z.ZodType<WireNode> {
  return z.object({
    type: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(200).optional(),
    text: z.string().trim().min(1).max(1000).optional(),
    children: z.array(depth < 6 ? nodeAtDepth(depth + 1) :
      z.never({ error: 'Maximum node nesting depth is 6' })).max(40).optional(),
    direction: z.enum(['vertical', 'horizontal']).optional(),
    gap: z.number().finite().min(0).max(64).optional(),
    padding: z.number().finite().min(0).max(48).optional(),
    items: z.array(z.string().trim().min(1).max(200)).min(1).max(20).optional(),
    placeholder: z.string().max(200).optional(),
    checked: z.boolean().optional(),
    values: z.array(z.number().finite().min(0).max(100)).min(1).max(20).optional(),
  }).superRefine((node, ctx) => {
    const required: Record<string, string[]> = {
      stack: ['children'], text: ['text'], button: ['label'], input: ['label'],
      image: ['label'], card: ['label', 'children'], list: ['items'], navbar: ['label'],
      tabbar: ['items'], chip: ['label'], toggle: ['label'], avatar: ['label'],
      chart: ['label', 'values'], note: ['text'],
    };
    for (const key of Object.prototype.hasOwnProperty.call(required, node.type) ? required[node.type] : []) {
      if (node[key as keyof typeof node] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Required for ${node.type}` });
      }
    }
  }).transform(node => ({ ...node, fallback: !(nodeTypes as readonly string[]).includes(node.type) }));
}

export const nodeSchema = nodeAtDepth(1).describe(
  'Rough wireframe node, maximum 6 levels. Required by type: stack(children); text/note(text); ' +
  'button/input/image/navbar/chip/toggle/avatar(label); card(label,children); list/tabbar(items); ' +
  'chart(label,values:0–100); divider(). Unknown types render a labeled placeholder. ' +
  'Optional layout: direction=vertical|horizontal, gap=0–64, padding=0–48.',
);
export const screenSchema = z.object({
  name: z.string().trim().min(1).max(100),
  platform: z.enum(['mobile', 'tablet', 'desktop']),
  root: nodeSchema,
});
export const ideaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  approach: approachSchema,
  rationale: z.string().trim().min(1).max(1200),
  makePrompt: z.string().trim().min(1).max(4000),
  screens: z.array(screenSchema).min(1).max(3),
});
export const renderIdeasSchema = z.object({
  hmw: z.string().trim().min(1).max(500),
  ideas: z.array(ideaSchema).min(1).max(15),
}).superRefine((spec, ctx) => {
  let count = 0;
  const visit = (node: WireNode) => { count++; node.children?.forEach(visit); };
  spec.ideas.forEach(idea => idea.screens.forEach(screen => visit(screen.root)));
  if (count > 600) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ideas'], message: 'Use at most 600 wireframe nodes per batch' });
});
export type Screen = z.infer<typeof screenSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export type RenderIdeas = z.infer<typeof renderIdeasSchema>;
export type ValidationResult = { success: true; data: RenderIdeas } | { success: false; errors: string[] };

export function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, key) => typeof key === 'number' ?
    `${result}[${key}]` : `${result}${result ? '.' : ''}${String(key)}`, '') || 'spec';
}

export function validateSpec(input: unknown): ValidationResult {
  const parsed = renderIdeasSchema.safeParse(input);
  return parsed.success ? { success: true, data: parsed.data } : {
    success: false, errors: parsed.error.issues.map(issue => `${formatPath(issue.path)}: ${issue.message}`),
  };
}
