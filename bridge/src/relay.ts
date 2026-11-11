import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { BRIDGE_PORT, PAIRING_TIMEOUT_MS, PAIRING_FAILED_CLOSE_CODE, REPLACED_CLOSE_CODE,
  type PairingAcknowledgment, type Request } from '../../shared/protocol';
import type { RenderIdeas } from '../../shared/spec';

export interface Relay {
  readonly connected: boolean;
  readonly pairingToken: string;
  request(type: Request['type'], payload?: RenderIdeas): Promise<unknown>;
}
export type RelayErrorCode = 'NOT_CONNECTED' | 'TIMEOUT' | 'DISCONNECTED' | 'PORT_IN_USE' | 'PLUGIN_ERROR';
export class RelayError extends Error {
  constructor(public readonly code: RelayErrorCode, message: string) { super(message); this.name = 'RelayError'; }
}
interface Pending { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }

export class WebSocketRelay implements Relay {
  private server?: WebSocketServer;
  private socket?: WebSocket;
  private readonly pending = new Map<string, Pending>();
  private readonly timeoutMs: number;
  private readonly pairingTimeoutMs: number;
  private pairingSecret = randomBytes(32);
  port: number;

  constructor(options: { port?: number; timeoutMs?: number; pairingTimeoutMs?: number } = {}) {
    this.port = options.port ?? BRIDGE_PORT;
    this.timeoutMs = options.timeoutMs ?? 45_000;
    this.pairingTimeoutMs = options.pairingTimeoutMs ?? PAIRING_TIMEOUT_MS;
  }
  get connected() { return this.socket?.readyState === WebSocket.OPEN; }
  // Available only through the trusted stdio MCP interface, never over WebSocket.
  get pairingToken() { return this.pairingSecret.toString('base64url'); }

  async start(): Promise<void> {
    const server = new WebSocketServer({
      host: '127.0.0.1', port: this.port, maxPayload: 1024 * 1024,
      verifyClient: ({ req }, done) => {
        const origin = req.headers.origin;
        const host = req.headers.host?.split(':')[0];
        done((origin === undefined || origin === 'null') && (host === 'localhost' || host === '127.0.0.1'), 403, 'Forbidden');
      },
    });
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => { server.off('error', rejectStart); resolve(); });
      const rejectStart = (error: NodeJS.ErrnoException) => {
        reject(error.code === 'EADDRINUSE' ? new RelayError('PORT_IN_USE',
          `Port ${this.port} is in use. Close the other HMW Diverger agent session and restart this MCP server.`) : error);
      };
      server.once('error', rejectStart);
    });
    this.server = server;
    this.pairingSecret = randomBytes(32);
    this.port = (server.address() as { port: number }).port;
    // Runtime errors must not escape as unhandled EventEmitter errors.
    server.on('error', () => this.disconnect('The local bridge stopped. Restart the MCP server.'));
    server.on('connection', socket => {
      // Opaque Origins also belong to sandboxed websites. A candidate must prove
      // possession of the session token before it can replace the active plugin.
      let authenticated = false;
      const rejectPairing = () => socket.close(PAIRING_FAILED_CLOSE_CODE, 'Pairing required. Get the current token from your agent.');
      const pairingTimer = setTimeout(rejectPairing, this.pairingTimeoutMs);
      socket.on('message', (data, isBinary) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        let reply: unknown;
        try { reply = isBinary ? undefined : JSON.parse(data.toString()); } catch { /* rejected below during pairing */ }
        if (!authenticated) {
          if (!this.isValidPairing(reply)) { clearTimeout(pairingTimer); rejectPairing(); return; }
          authenticated = true;
          clearTimeout(pairingTimer);
          const previous = this.socket;
          this.disconnect('A new paired plugin connection replaced the previous one.');
          this.socket = socket;
          previous?.close(REPLACED_CLOSE_CODE, 'Replaced by another paired plugin');
          const acknowledgment: PairingAcknowledgment = { type: 'paired' };
          socket.send(JSON.stringify(acknowledgment));
          return;
        }
        if (socket !== this.socket) return;
        if (!reply || typeof reply !== 'object' || !('id' in reply) || typeof reply.id !== 'string' || !('ok' in reply)) return;
        const pending = this.pending.get(reply.id);
        if (!pending) return;
        if (reply.ok === true && 'result' in reply) {
          this.finish(reply.id); pending.resolve(reply.result);
        } else if (reply.ok === false && 'errors' in reply && Array.isArray(reply.errors) && reply.errors.every(e => typeof e === 'string')) {
          this.finish(reply.id); pending.reject(new RelayError('PLUGIN_ERROR', reply.errors.join('\n')));
        }
      });
      const onClose = () => {
        clearTimeout(pairingTimer);
        if (socket !== this.socket) return;
        this.socket = undefined;
        this.disconnect('The Figma plugin disconnected. Reopen HMW Diverger and try again.');
      };
      socket.on('close', onClose);
      socket.on('error', onClose);
    });
  }

  private isValidPairing(message: unknown): boolean {
    if (!message || typeof message !== 'object' || !('type' in message) || message.type !== 'pair' ||
      !('token' in message) || typeof message.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.token)) return false;
    return timingSafeEqual(Buffer.from(message.token), Buffer.from(this.pairingToken));
  }

  async request(type: Request['type'], payload?: RenderIdeas): Promise<unknown> {
    if (!this.connected) throw new RelayError('NOT_CONNECTED', 'No paired Figma plugin connected. Open HMW Diverger and pair it with the token from figma_status({includePairingToken:true}).');
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RelayError('TIMEOUT', 'Figma did not reply in time. Check the plugin and the canvas before retrying; the render may have finished.'));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ id, type, ...(payload ? { payload } : {}) }), error => {
        if (error && this.pending.has(id)) {
          this.finish(id); reject(new RelayError('DISCONNECTED', error.message));
        }
      });
    });
  }

  private finish(id: string) { clearTimeout(this.pending.get(id)?.timer); this.pending.delete(id); }
  private disconnect(message: string) {
    for (const [id, pending] of this.pending) {
      this.finish(id); pending.reject(new RelayError('DISCONNECTED', message));
    }
  }
  async close(): Promise<void> {
    this.disconnect('The bridge is closing.');
    this.socket = undefined;
    const server = this.server; this.server = undefined;
    if (!server) return;
    for (const client of server.clients) client.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
