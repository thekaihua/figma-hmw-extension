import { once } from 'node:events';
import { createServer } from 'node:net';
import WebSocket from 'ws';
import { afterEach, describe, expect, test } from 'vitest';
import { WebSocketRelay, RelayError } from '../src/relay';

const relays: WebSocketRelay[] = [];
const sockets: WebSocket[] = [];
afterEach(async () => {
  sockets.splice(0).forEach(socket => socket.terminate());
  await Promise.all(relays.splice(0).map(relay => relay.close()));
});
async function start(timeoutMs = 1000, pairingTimeoutMs = 1000) {
  const relay = new WebSocketRelay({ port: 0, timeoutMs, pairingTimeoutMs });
  await relay.start(); relays.push(relay); return relay;
}
async function openSocket(relay: WebSocketRelay, origin?: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${relay.port}`, origin ? { origin } : {});
  sockets.push(socket); await once(socket, 'open'); return socket;
}
async function pair(socket: WebSocket, token: string) {
  const reply = once(socket, 'message');
  socket.send(JSON.stringify({ type: 'pair', token }));
  const [data] = await reply;
  expect(JSON.parse(data.toString())).toEqual({ type: 'paired' });
}
async function connect(relay: WebSocketRelay, origin?: string) {
  const socket = await openSocket(relay, origin); await pair(socket, relay.pairingToken); return socket;
}

describe('WebSocket relay', () => {
  test('correlates replies by id with two requests in flight', async () => {
    const relay = await start(); const socket = await connect(relay, 'null');
    const messages: { id: string }[] = [];
    socket.on('message', data => {
      messages.push(JSON.parse(data.toString()));
      if (messages.length === 2) for (const [i, message] of [...messages.entries()].reverse()) {
        socket.send(JSON.stringify({ id: message.id, ok: true, result: { order: i } }));
      }
    });
    const first = relay.request('status'); const second = relay.request('status');
    expect(await first).toEqual({ order: 0 });
    expect(await second).toEqual({ order: 1 });
  });
  test('rejects immediately without a plugin', async () => {
    const relay = await start();
    await expect(relay.request('status')).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
  });
  test('times out and ignores malformed or unrelated replies', async () => {
    const relay = await start(30); const socket = await connect(relay);
    socket.on('message', () => { socket.send('not json'); socket.send(JSON.stringify({ id: 'wrong', ok: true })); });
    await expect(relay.request('status')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  test('refuses browser Origins and requires pairing for null and absent Origin', async () => {
    const relay = await start();
    const rejected = new WebSocket(`ws://127.0.0.1:${relay.port}`, { origin: 'https://attacker.example' });
    sockets.push(rejected);
    const [error] = await once(rejected, 'error');
    expect(error.message).toContain('403');
    await connect(relay, 'null'); expect(relay.connected).toBe(true);
    await connect(relay); expect(relay.connected).toBe(true);
  });
  test('generates an unpredictable token for each bridge session', async () => {
    const first = await start(); const second = await start();
    expect(first.pairingToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.pairingToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.pairingToken).not.toBe(second.pairingToken);
  });
  test('restarting the bridge invalidates the old token and permits pairing with the new one', async () => {
    const relay = await start(); const oldToken = relay.pairingToken;
    await connect(relay); await relay.close(); await relay.start();
    expect(relay.pairingToken).not.toBe(oldToken);
    const stale = await openSocket(relay, 'null'); const closed = once(stale, 'close');
    stale.send(JSON.stringify({ type: 'pair', token: oldToken }));
    expect((await closed)[0]).toBe(4003); expect(relay.connected).toBe(false);
    await connect(relay); expect(relay.connected).toBe(true);
  });
  test('an unpaired null-Origin socket never becomes the plugin or receives agent payloads', async () => {
    const relay = await start(); const attacker = await openSocket(relay, 'null');
    const messages: string[] = []; attacker.on('message', data => messages.push(data.toString()));
    expect(relay.connected).toBe(false);
    await expect(relay.request('status')).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    expect(messages).toEqual([]);
  });
  test.each([undefined, 'wrong', 'A'.repeat(43)])('rejects an invalid pairing token without exposing it (%s)', async token => {
    const relay = await start(); const attacker = await openSocket(relay, 'null');
    const closed = once(attacker, 'close'); const messages: string[] = [];
    attacker.on('message', data => messages.push(data.toString()));
    attacker.send(JSON.stringify({ type: 'pair', token }));
    const [code, reason] = await closed;
    expect(code).toBe(4003); expect(reason.toString()).not.toContain(relay.pairingToken);
    expect(messages).toEqual([]); expect(relay.connected).toBe(false);
  });
  test('an unauthenticated connection cannot evict the plugin or forge its replies', async () => {
    const relay = await start(); const plugin = await connect(relay, 'null');
    const requestReceived = once(plugin, 'message');
    const pending = relay.request('status');
    const [data] = await requestReceived; const request = JSON.parse(data.toString());
    const attacker = await openSocket(relay, 'null'); const closed = once(attacker, 'close');
    const leaked: string[] = []; attacker.on('message', message => leaked.push(message.toString()));
    attacker.send(JSON.stringify({ id: request.id, ok: false, errors: ['Untrusted instruction'] }));
    expect((await closed)[0]).toBe(4003);
    expect(relay.connected).toBe(true); expect(plugin.readyState).toBe(WebSocket.OPEN);
    plugin.send(JSON.stringify({ id: request.id, ok: true, result: { page: 'Trusted plugin' } }));
    expect(await pending).toEqual({ page: 'Trusted plugin' }); expect(leaked).toEqual([]);
  });
  test('a silent candidate times out without replacing a paired plugin', async () => {
    const relay = await start(1000, 30); const plugin = await connect(relay);
    const candidate = await openSocket(relay, 'null');
    expect((await once(candidate, 'close'))[0]).toBe(4003);
    expect(plugin.readyState).toBe(WebSocket.OPEN); expect(relay.connected).toBe(true);
  });
  test('replaces the first plugin and rejects its pending work', async () => {
    const relay = await start(); const first = await connect(relay);
    const closed = once(first, 'close');
    const pending = expect(relay.request('status')).rejects.toMatchObject({ code: 'DISCONNECTED' });
    const second = await connect(relay);
    await closed; await pending;
    second.on('message', data => second.send(JSON.stringify({ id: JSON.parse(data.toString()).id, ok: true, result: { page: 'New' } })));
    expect(await relay.request('status')).toEqual({ page: 'New' });
  });
  test('rejects a plugin error and disconnect without waiting for timeout', async () => {
    const relay = await start(); const socket = await connect(relay);
    socket.once('message', data => socket.send(JSON.stringify({ id: JSON.parse(data.toString()).id, ok: false, errors: ['Font unavailable'] })));
    await expect(relay.request('status')).rejects.toThrow('Font unavailable');
    const pending = expect(relay.request('status')).rejects.toMatchObject({ code: 'DISCONNECTED' });
    socket.close(); await pending;
  });
  test('reports a typed port-in-use error', async () => {
    const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const port = (server.address() as { port: number }).port;
    try {
      const relay = new WebSocketRelay({ port });
      await expect(relay.start()).rejects.toBeInstanceOf(RelayError);
      await expect(relay.start()).rejects.toMatchObject({ code: 'PORT_IN_USE' });
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
