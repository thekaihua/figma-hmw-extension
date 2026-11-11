import { afterEach, expect, test, vi } from 'vitest';
import { createConnection, type ConnectionSocket } from '../src/ui/connection';
import { PAIRING_TIMEOUT_MS } from '../../shared/protocol';
import { spec } from '../../shared/fixtures';

const token = 'A'.repeat(43);
class FakeSocket implements ConnectionSocket {
  readyState = 0;
  handlers: Record<string, ((event: { data?: unknown; code: number }) => void)[]> = {};
  send = vi.fn();
  close = vi.fn((code = 1000) => { this.readyState = 3; this.emit('close', undefined, code); });
  addEventListener(type: string, callback: (event: never) => void) {
    (this.handlers[type] ??= []).push(callback as (event: { data?: unknown; code: number }) => void);
  }
  emit(type: string, data?: unknown, code = 1000) { this.handlers[type]?.forEach(callback => callback({ data, code })); }
  open() { this.readyState = 1; this.emit('open'); }
  approve() { this.open(); this.emit('message', JSON.stringify({ type: 'paired' })); }
}
afterEach(() => vi.useRealTimers());
function setup() {
  const sockets: FakeSocket[] = [];
  const sendToPlugin = vi.fn(); const onStatus = vi.fn(); const onRun = vi.fn();
  const createSocket = vi.fn(() => { const socket = new FakeSocket(); sockets.push(socket); return socket; });
  const connection = createConnection({ createSocket, sendToPlugin, onStatus, onRun });
  return { sockets, sendToPlugin, onStatus, onRun, createSocket, connection };
}
test('requires a user-supplied token before opening a socket', () => {
  const { connection, createSocket, onStatus } = setup(); connection.start();
  expect(onStatus).toHaveBeenLastCalledWith('pairing_required'); expect(createSocket).not.toHaveBeenCalled();
});
test('sends the token only in the first message and waits for a pairing acknowledgment', () => {
  const { sockets, onStatus, connection, createSocket, sendToPlugin, onRun } = setup(); connection.start(token);
  expect(createSocket).toHaveBeenCalledWith('ws://localhost:3055');
  sockets[0].open();
  expect(sockets[0].send).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ type: 'pair', token }));
  expect(onStatus).toHaveBeenLastCalledWith('waiting');
  sockets[0].emit('message', JSON.stringify({ id: 'before-pairing', type: 'status' }));
  expect(sendToPlugin).not.toHaveBeenCalled();
  sockets[0].emit('message', JSON.stringify({ type: 'paired' }));
  expect(onStatus).toHaveBeenLastCalledWith('connected'); expect(onRun).not.toHaveBeenCalled(); connection.stop();
});
test('reconnects with backoff, resending the in-memory token and resetting after pairing', () => {
  vi.useFakeTimers(); const { sockets, connection } = setup(); connection.start(token); sockets[0].close();
  vi.advanceTimersByTime(499); expect(sockets).toHaveLength(1);
  vi.advanceTimersByTime(1); expect(sockets).toHaveLength(2); sockets[1].close();
  vi.advanceTimersByTime(999); expect(sockets).toHaveLength(2);
  vi.advanceTimersByTime(1); expect(sockets).toHaveLength(3); sockets[2].approve();
  expect(sockets[2].send).toHaveBeenCalledWith(JSON.stringify({ type: 'pair', token })); sockets[2].close();
  vi.advanceTimersByTime(500); expect(sockets).toHaveLength(4);
  connection.stop(); vi.advanceTimersByTime(60_000); expect(sockets).toHaveLength(4);
});
test('forwards commands and replies only after pairing and preserves request ids', () => {
  const { sockets, connection, sendToPlugin, onRun } = setup(); connection.start(token); const socket = sockets[0]; socket.approve();
  const request = { id: 'request:1', type: 'render_ideas', payload: spec };
  socket.emit('message', JSON.stringify(request)); expect(sendToPlugin).toHaveBeenCalledWith(request);
  const reply = { id: request.id, ok: true, result: { ideaCount: 1, screenCount: 1, sectionId: '1:1', frames: [] } };
  connection.receiveReply(reply); expect(socket.send).toHaveBeenCalledWith(JSON.stringify(reply)); expect(onRun).toHaveBeenCalledWith(reply);
  socket.emit('message', 'invalid json'); socket.emit('message', JSON.stringify({ type: 'delete_everything', id: 'bad' }));
  expect(sendToPlugin).toHaveBeenCalledTimes(1); connection.stop();
});
test('does not send old or local replies to a new paired bridge connection', () => {
  vi.useFakeTimers(); const { sockets, connection } = setup(); connection.start(token); sockets[0].approve();
  sockets[0].emit('message', JSON.stringify({ id: 'old', type: 'status' })); sockets[0].close();
  vi.advanceTimersByTime(500); sockets[1].approve(); sockets[1].send.mockClear();
  connection.receiveReply({ id: 'old', ok: true, result: { connected: true, file: 'File', page: 'Page' } });
  connection.receiveReply({ id: 'paste:1', ok: false, errors: ['Invalid JSON'] });
  expect(sockets[1].send).not.toHaveBeenCalled(); connection.stop();
});
test('handles a socket factory failure without crashing', () => {
  vi.useFakeTimers(); const onStatus = vi.fn();
  const createSocket = vi.fn<() => ConnectionSocket>().mockImplementationOnce(() => { throw new Error('Blocked'); }).mockReturnValue(new FakeSocket());
  const connection = createConnection({ createSocket, onStatus, sendToPlugin: vi.fn(), onRun: vi.fn() });
  expect(() => connection.start(token)).not.toThrow(); vi.advanceTimersByTime(500); expect(createSocket).toHaveBeenCalledTimes(2); connection.stop();
});
test('a replaced plugin pauses reconnects and can explicitly reconnect with its retained token', () => {
  vi.useFakeTimers(); const { sockets, connection, onStatus } = setup();
  connection.start(token); sockets[0].approve(); sockets[0].close(4001);
  expect(onStatus).toHaveBeenLastCalledWith('replaced');
  vi.advanceTimersByTime(60_000); expect(sockets).toHaveLength(1);
  connection.start(); expect(sockets).toHaveLength(2); sockets[1].approve();
  expect(sockets[1].send).toHaveBeenCalledWith(JSON.stringify({ type: 'pair', token })); connection.stop();
});
test('rejected pairing clears the stale token and waits for the user to enter a new one', () => {
  vi.useFakeTimers(); const { sockets, connection, onStatus } = setup(); connection.start(token); sockets[0].open(); sockets[0].close(4003);
  expect(onStatus).toHaveBeenLastCalledWith('pairing_required');
  vi.advanceTimersByTime(60_000); connection.start(); expect(sockets).toHaveLength(1);
  connection.start('B'.repeat(43)); sockets[1].approve();
  expect(sockets[1].send).toHaveBeenCalledWith(JSON.stringify({ type: 'pair', token: 'B'.repeat(43) })); connection.stop();
});
test('a missing pairing acknowledgment times out without forwarding document requests', () => {
  vi.useFakeTimers(); const { sockets, connection, onStatus, sendToPlugin } = setup(); connection.start(token); sockets[0].open();
  vi.advanceTimersByTime(PAIRING_TIMEOUT_MS);
  expect(onStatus).toHaveBeenLastCalledWith('pairing_required'); expect(sendToPlugin).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000); expect(sockets).toHaveLength(1); connection.stop();
});
test('stop discards the token and malformed tokens never open a socket', () => {
  const { sockets, connection, createSocket, onStatus } = setup();
  connection.start('short'); expect(createSocket).not.toHaveBeenCalled();
  connection.start(token); connection.stop(); connection.start();
  expect(sockets).toHaveLength(1); expect(onStatus).toHaveBeenLastCalledWith('pairing_required');
});
