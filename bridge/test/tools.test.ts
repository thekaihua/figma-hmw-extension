import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, expect, test, vi } from 'vitest';
import { spec } from '../../shared/fixtures';
import { createMcpServer } from '../src/tools';
import { RelayError, type Relay } from '../src/relay';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanup.splice(0).map(close => close())); });
async function setup(connected = true) {
  const relay = { connected, pairingToken: 'test-token', request: vi.fn<Relay['request']>() };
  const server = createMcpServer(relay);
  const client = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  cleanup.push(() => client.close(), () => server.close());
  return { client, relay };
}
export const rendered = {
  sectionId: '1:1', ideaCount: 1, screenCount: 1,
  frames: [{ idea: 'Budget buddy', cardId: '1:2', screenIds: ['1:3'], columnId: '1:4' }],
};
test('advertises tools and the diverge prompt', async () => {
  const { client } = await setup();
  const tools = await client.listTools();
  expect(tools.tools.map(t => t.name)).toEqual(['figma_status', 'render_ideas']);
  expect(JSON.stringify(tools.tools[1].inputSchema)).toContain('screens');
  expect((await client.listPrompts()).prompts.map(p => p.name)).toEqual(['diverge']);
});
test('returns path-based tool errors before contacting the relay', async () => {
  const { client, relay } = await setup();
  const result = await client.callTool({ name: 'render_ideas', arguments: { hmw: spec.hmw, ideas: [{ title: 'Missing fields' }] } });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain('ideas[0].rationale');
  expect(relay.request).not.toHaveBeenCalled();
});
test('relays a validated batch exactly once and summarizes created frames', async () => {
  const { client, relay } = await setup(); relay.request.mockResolvedValue(rendered);
  const result = await client.callTool({ name: 'render_ideas', arguments: spec });
  expect(result.isError).not.toBe(true);
  expect(relay.request).toHaveBeenCalledExactlyOnceWith('render_ideas', expect.objectContaining({ hmw: spec.hmw }));
  expect(result.structuredContent).toEqual(rendered);
  expect(JSON.stringify(result.content)).toContain('1 idea');
  expect(JSON.stringify(result.content)).toContain('1:3');
});
test.each(['NOT_CONNECTED', 'TIMEOUT', 'PORT_IN_USE'] as const)('reports readable %s errors', async code => {
  const { client, relay } = await setup(); relay.request.mockRejectedValue(new RelayError(code, `Please fix ${code}`));
  const result = await client.callTool({ name: 'render_ideas', arguments: spec });
  expect(result.isError).toBe(true); expect(JSON.stringify(result.content)).toContain(`Please fix ${code}`);
});
test('status reports disconnected without forwarding and connected file/page', async () => {
  const { client, relay } = await setup(false);
  const result = await client.callTool({ name: 'figma_status' });
  expect(result.structuredContent).toMatchObject({ connected: false, pairingRequired: true });
  expect(JSON.stringify(result)).not.toContain(relay.pairingToken);
  expect(relay.request).not.toHaveBeenCalled();
  relay.connected = true; relay.request.mockResolvedValue({ connected: true, file: 'Budget', page: 'Ideas' });
  expect((await client.callTool({ name: 'figma_status' })).structuredContent).toEqual({ connected: true, file: 'Budget', page: 'Ideas' });
});
test('exposes the pairing token only when explicitly requested over MCP', async () => {
  const { client, relay } = await setup(false);
  const result = await client.callTool({ name: 'figma_status', arguments: { includePairingToken: true } });
  expect(result.structuredContent).toMatchObject({ connected: false, pairingToken: relay.pairingToken });
  expect(JSON.stringify(result.content)).toContain('plugin');
  relay.connected = true; relay.request.mockResolvedValue({ connected: true, file: 'Budget', page: 'Ideas' });
  expect((await client.callTool({ name: 'figma_status', arguments: { includePairingToken: true } })).structuredContent).toMatchObject({
    connected: true, pairingToken: relay.pairingToken,
  });
  const invalid = await client.callTool({ name: 'figma_status', arguments: { includePairingToken: 'yes' } });
  expect(invalid.isError).toBe(true); expect(JSON.stringify(invalid)).not.toContain(relay.pairingToken);
});
test('diverge gives HMW, count, distinct concepts and one render call', async () => {
  const { client } = await setup();
  const result = await client.getPrompt({ name: 'diverge', arguments: { hmw: spec.hmw, count: '6' } });
  const text = JSON.stringify(result.messages);
  for (const expected of [spec.hmw, '6', 'make each idea distinctly different', 'single render_ideas call', 'makePrompt', 'screens']) expect(text).toContain(expected);
  await expect(client.getPrompt({ name: 'diverge', arguments: { hmw: spec.hmw, count: '16' } })).rejects.toThrow('count');
});
