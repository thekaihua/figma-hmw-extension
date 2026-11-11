import { BRIDGE_URL, PAIRING_TIMEOUT_MS, PAIRING_FAILED_CLOSE_CODE, REPLACED_CLOSE_CODE,
  type PairingRequest, type Reply, type Request } from '../../../shared/protocol';

export interface ConnectionSocket {
  readonly readyState: number;
  addEventListener(type: 'open' | 'error', listener: () => void): void;
  addEventListener(type: 'close', listener: (event: { code: number }) => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}
interface ConnectionOptions {
  createSocket: (url: string) => ConnectionSocket;
  sendToPlugin: (request: Request) => void;
  onStatus: (status: 'pairing_required' | 'waiting' | 'connected' | 'replaced') => void;
  onRun: (reply: Reply) => void;
}

export function createConnection(options: ConnectionOptions) {
  let socket: ConnectionSocket | undefined;
  let running = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let pairingTimer: ReturnType<typeof setTimeout> | undefined;
  let token: string | undefined;
  const pending = new Map<string, ConnectionSocket>();

  function reconnect() {
    if (!running || retry !== undefined) return;
    options.onStatus('waiting');
    const delay = Math.min(500 * 2 ** Math.min(attempt++, 5), 10_000);
    retry = setTimeout(() => { retry = undefined; connect(); }, delay);
  }
  function connect() {
    if (!running) return;
    options.onStatus('waiting');
    let current: ConnectionSocket;
    try { current = options.createSocket(BRIDGE_URL); } catch { reconnect(); return; }
    socket = current;
    let authenticated = false;
    current.addEventListener('open', () => {
      if (!running || socket !== current) return;
      pairingTimer = setTimeout(() => {
        if (running && socket === current && !authenticated) current.close(PAIRING_FAILED_CLOSE_CODE, 'Pairing timed out');
      }, PAIRING_TIMEOUT_MS);
      const pairing: PairingRequest = { type: 'pair', token: token! };
      current.send(JSON.stringify(pairing));
    });
    current.addEventListener('close', event => {
      for (const [id, owner] of pending) if (owner === current) pending.delete(id);
      if (socket !== current) return;
      clearTimeout(pairingTimer); pairingTimer = undefined;
      socket = undefined;
      if (event.code === PAIRING_FAILED_CLOSE_CODE && running) {
        running = false; token = undefined; options.onStatus('pairing_required'); return;
      }
      if (event.code === REPLACED_CLOSE_CODE && running) {
        running = false; options.onStatus('replaced'); return;
      }
      reconnect();
    });
    current.addEventListener('error', () => {
      // The browser emits close after error; closing also handles factory implementations.
      current.close();
    });
    current.addEventListener('message', event => {
      if (!running || socket !== current || typeof event.data !== 'string') return;
      let message: unknown;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!authenticated) {
        if (message && typeof message === 'object' && 'type' in message && message.type === 'paired') {
          authenticated = true; clearTimeout(pairingTimer); pairingTimer = undefined;
          attempt = 0; options.onStatus('connected');
        }
        return;
      }
      if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string' ||
        message.id.length > 128 || !('type' in message) || !['status', 'render_ideas'].includes(String(message.type))) return;
      pending.set(message.id, current);
      options.sendToPlugin(message as Request);
    });
  }
  function stop() {
    running = false; token = undefined;
    clearTimeout(retry); retry = undefined;
    clearTimeout(pairingTimer); pairingTimer = undefined;
    socket?.close(); socket = undefined; pending.clear();
  }
  return {
    start(pairingToken?: string) {
      if (pairingToken !== undefined) { stop(); token = pairingToken.trim(); }
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        token = undefined; options.onStatus('pairing_required'); return;
      }
      if (running) return;
      running = true; attempt = 0; connect();
    },
    stop,
    receiveReply(message: unknown) {
      if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string' ||
        !('ok' in message) || typeof message.ok !== 'boolean') return;
      const owner = pending.get(message.id); pending.delete(message.id);
      if (owner?.readyState === 1 && owner === socket) owner.send(JSON.stringify(message));
      options.onRun(message as Reply);
    },
  };
}

function bootUI() {
  const status = document.getElementById('connection-status')!;
  const log = document.getElementById('run-log')!;
  const paste = document.getElementById('paste-json') as HTMLTextAreaElement;
  const render = document.getElementById('render-json') as HTMLButtonElement;
  const errorBox = document.getElementById('paste-error')!;
  const pairingForm = document.getElementById('pairing-form') as HTMLFormElement;
  const pairingToken = document.getElementById('pairing-token') as HTMLInputElement;
  const localRuns = new Set<string>();
  let localId = 0;
  const connection = createConnection({
    createSocket: url => new WebSocket(url),
    sendToPlugin: request => parent.postMessage({ pluginMessage: request }, '*'),
    onStatus: state => {
      const labels = { connected: 'Bridge connected', replaced: 'Another plugin active',
        waiting: 'Waiting for bridge', pairing_required: 'Pair bridge' };
      status.textContent = labels[state];
      status.dataset.state = state;
      document.getElementById('reconnect')!.hidden = state !== 'replaced';
      document.getElementById('pairing-panel')!.hidden = state === 'connected' || state === 'replaced';
    },
    onRun: reply => {
      if (localRuns.delete(reply.id)) {
        render.disabled = false; render.textContent = 'Render JSON';
        errorBox.textContent = reply.ok ? '' : reply.errors.join('\n');
      }
      if (reply.ok && !('ideaCount' in reply.result)) return;
      document.getElementById('empty-runs')?.remove();
      const entry = document.createElement('li');
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      entry.textContent = reply.ok && 'ideaCount' in reply.result ?
        `${time} · ${reply.result.ideaCount} ideas / ${reply.result.screenCount} screens created` :
        `${time} · ${!reply.ok ? reply.errors.join('; ') : 'Run finished'}`;
      if (!reply.ok) entry.className = 'run-error';
      log.prepend(entry); while (log.children.length > 8) log.lastElementChild?.remove();
    },
  });
  window.addEventListener('message', event => {
    if (event.source === parent) connection.receiveReply(event.data?.pluginMessage);
  });
  window.addEventListener('unload', () => connection.stop());
  document.getElementById('reconnect')!.addEventListener('click', () => connection.start());
  pairingToken.addEventListener('input', () => pairingToken.setCustomValidity(''));
  pairingForm.addEventListener('submit', event => {
    event.preventDefault();
    const secret = pairingToken.value.trim();
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) {
      pairingToken.setCustomValidity('Paste the 43-character pairing token from your agent.');
      pairingToken.reportValidity(); return;
    }
    // Retain the secret only in the connection closure for this open UI session.
    pairingToken.value = '';
    connection.start(secret);
  });
  render.addEventListener('click', () => {
    const id = `paste:${++localId}`; localRuns.add(id);
    render.disabled = true; render.textContent = 'Rendering…'; errorBox.textContent = '';
    parent.postMessage({ pluginMessage: { id, type: 'paste_json', json: paste.value } }, '*');
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    button.addEventListener('click', async () => {
      const value = document.getElementById(button.dataset.copy!)!.textContent!;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
        else {
          const field = document.createElement('textarea'); field.value = value;
          field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
          const copied = document.execCommand('copy'); field.remove(); if (!copied) throw new Error('Copy unavailable');
        }
        button.textContent = 'Copied';
      } catch { button.textContent = 'Select text'; }
      setTimeout(() => { button.textContent = 'Copy'; }, 2000);
    });
  }
  connection.start();
}
if (typeof document !== 'undefined') bootUI();
