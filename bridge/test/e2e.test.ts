import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import WebSocket from 'ws';
import { expect, test } from 'vitest';
import { spec } from '../../shared/fixtures';
import type { RenderResult, Reply, Request } from '../../shared/protocol';
import { WebSocketRelay } from '../src/relay';
import { createMcpServer } from '../src/tools';

test('an MCP batch crosses the real relay and the plugin reply becomes the tool result', async () => {
  const relay = new WebSocketRelay({ port: 0 }); await relay.start();
  const server = createMcpServer(relay); const client = new Client({ name: 'contract-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const plugin = new WebSocket(`ws://127.0.0.1:${relay.port}`, { origin: 'null' });
  const received: Request[] = [];
  let unpaired: WebSocket | undefined;
  const leaked: string[] = [];
  const rendered: RenderResult = { sectionId: 'section:1', ideaCount: 1, screenCount: 1,
    frames: [{ idea: 'Budget buddy', cardId: 'card:1', columnId: 'column:1', screenIds: ['screen:1'] }] };
  try {
    await Promise.all([server.connect(a), client.connect(b), once(plugin, 'open')]);
    const pairingStatus = await client.callTool({ name: 'figma_status', arguments: { includePairingToken: true } });
    expect(pairingStatus.structuredContent).toMatchObject({ connected: false, pairingRequired: true });
    const paired = once(plugin, 'message');
    const { pairingToken } = pairingStatus.structuredContent as { pairingToken: string };
    plugin.send(JSON.stringify({ type: 'pair', token: pairingToken }));
    expect(JSON.parse((await paired)[0].toString())).toEqual({ type: 'paired' });
    unpaired = new WebSocket(`ws://127.0.0.1:${relay.port}`, { origin: 'null' });
    unpaired.on('message', data => leaked.push(data.toString()));
    await once(unpaired, 'open');
    plugin.on('message', data => {
      const request: Request = JSON.parse(data.toString()); received.push(request);
      const reply: Reply = { id: request.id, ok: true, result: request.type === 'status' ?
        { connected: true, file: 'Budget', page: 'Ideas' } : rendered };
      plugin.send(JSON.stringify(reply));
    });
    const status = await client.callTool({ name: 'figma_status' });
    expect(status.structuredContent).toEqual({ connected: true, file: 'Budget', page: 'Ideas' });
    const result = await client.callTool({ name: 'render_ideas', arguments: spec });
    expect(result.structuredContent).toEqual(rendered);
    expect(received).toHaveLength(2);
    expect(received[1]).toMatchObject({ type: 'render_ideas', payload: {
      hmw: spec.hmw, ideas: [{ screens: [{ root: { type: 'text', fallback: false } }] }],
    } });
    expect(received[0].id).not.toBe(received[1].id);
    expect(leaked).toEqual([]); expect(plugin.readyState).toBe(WebSocket.OPEN);
  } finally { unpaired?.terminate(); plugin.terminate(); await Promise.all([client.close(), server.close(), relay.close()]); }
});
