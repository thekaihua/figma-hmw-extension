import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema,
  ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { renderIdeasSchema, validateSpec } from '../../shared/spec';
import type { RenderResult } from '../../shared/protocol';
import type { Relay } from './relay';

const promptArgs = z.object({
  hmw: z.string().trim().min(1).max(500),
  count: z.coerce.number().int().min(1).max(15).default(6),
});
const text = (value: string) => [{ type: 'text' as const, text: value }];
const statusArgs = z.object({ includePairingToken: z.boolean().optional() });
const pairingInstructions = 'Call figma_status with includePairingToken:true, then show the private token to the user to paste into the Figma plugin’s Pair bridge field. Keep the token out of URLs, files, idea specs, and run logs. Pair again after restarting the bridge.';

export function divergePrompt(hmw: string, count: number): string {
  return `You are a UX design ideation assistant. Generate exactly ${count} rough, throwaway UI/UX prototype ideas.
HMW: ${hmw}

Think divergently: make each idea distinctly different. Vary the core user flow, interaction pattern,
information hierarchy and prototype type, rather than reskinning one solution. Explore mobile, web,
dashboard, onboarding and feature approaches. Keep wireframes greyscale and low fidelity.

For every idea provide a short title; approach (mobile|web|dashboard|onboarding|feature);
rationale explaining the distinct bet; and makePrompt, a concrete 3–5 sentence brief for Figma Make.
The brief should describe screens/components, interactions, data, navigation and visual style.
Include 1–3 screens with name, platform (mobile|tablet|desktop), and root.

Wireframe node types and required fields:
stack: children (direction vertical|horizontal, gap and padding optional)
text: text; button: label; input: label (placeholder optional); image: label
card: label, children; list: items (strings); navbar: label; tabbar: items (strings)
chip: label; toggle: label (checked optional); avatar: label; divider: no extra fields
chart: label, values (numbers 0–100); note: text.
Use at most 6 levels and 600 wireframe nodes in the whole batch. Use layout stacks to compose screens.
Screen widths are 375/768/1280 for mobile/tablet/desktop, with automatic height.

First check figma_status. If pairing is required, call figma_status with includePairingToken:true,
show the private token to the user to enter in the plugin, and wait for pairing before rendering.
Keep the token out of idea specs, files and URLs. When connected, finish with a single render_ideas call for the entire batch,
passing { hmw, ideas: [...] }. Do not send one call per idea. If validation reports a path, fix that
field and retry the corrected batch. If a request times out, check the canvas before retrying.
Do not call Figma's official MCP or ask for an API key. The local plugin renders the editable nodes.`;
}

export function createMcpServer(relay: Relay): Server {
  const server = new Server({ name: 'hmw-diverger', version: '0.1.0' }, {
    capabilities: { tools: {}, prompts: {} },
    instructions: 'Generate distinct rough wireframe ideas for an HMW. Check figma_status; if pairing is required, request includePairingToken:true and show the token to the user to enter in the plugin. Wait for pairing, then send the entire batch in one render_ideas call. Keep the token out of specs, files and URLs. Only one agent session can own the local bridge.',
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    { name: 'figma_status', description: 'Check the paired HMW Diverger plugin and current file/page. Set includePairingToken:true to get the private session token for the user to enter in the plugin.',
      inputSchema: z.toJSONSchema(statusArgs, { io: 'input' }) as { type: 'object'; [key: string]: unknown } },
    { name: 'render_ideas', description: 'Render 1–15 distinct ideas in one Section. Each idea has a card and 1–3 editable rough wireframes. Send one call for the whole batch.',
      inputSchema: z.toJSONSchema(renderIdeasSchema, { io: 'input' }) as { type: 'object'; [key: string]: unknown } },
  ] }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      if (params.name === 'figma_status') {
        const args = statusArgs.safeParse(params.arguments ?? {});
        if (!args.success) return { isError: true, content: text(args.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')) };
        const connected = relay.connected;
        const status = connected ? await relay.request('status') as Record<string, unknown> : { connected: false };
        const result = { ...status,
          ...(!connected ? { pairingRequired: true } : {}),
          ...(args.data.includePairingToken ? { pairingToken: relay.pairingToken } : {}),
          ...(!connected || args.data.includePairingToken ? { pairingInstructions } : {}),
        };
        return { content: text(JSON.stringify(result)), structuredContent: result };
      }
      if (params.name !== 'render_ideas') return { isError: true, content: text(`Unknown tool: ${params.name}`) };
      const validated = validateSpec(params.arguments);
      if (!validated.success) return { isError: true, content: text(validated.errors.join('\n')) };
      const result = await relay.request('render_ideas', validated.data) as RenderResult;
      return {
        content: text(`Created ${result.ideaCount} idea(s), ${result.screenCount} screen(s) in Section ${result.sectionId}.\n${JSON.stringify(result.frames)}`),
        structuredContent: { ...result },
      };
    } catch (error) {
      return { isError: true, content: text(error instanceof Error ? error.message : String(error)) };
    }
  });
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [{
    name: 'diverge', description: 'Explore distinct visual directions for a How Might We statement in Figma.',
    arguments: [{ name: 'hmw', description: 'The How Might We statement', required: true },
      { name: 'count', description: 'Number of ideas (1–15, default 6)', required: false }],
  }] }));
  server.setRequestHandler(GetPromptRequestSchema, async ({ params }) => {
    if (params.name !== 'diverge') throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${params.name}`);
    const args = promptArgs.safeParse(params.arguments);
    if (!args.success) throw new McpError(ErrorCode.InvalidParams, args.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
    return { messages: [{ role: 'user', content: { type: 'text', text: divergePrompt(args.data.hmw, args.data.count) } }] };
  });
  return server;
}
