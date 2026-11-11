import { validateSpec, type ValidationResult } from '../../shared/spec';
import { renderIdeas } from './render/section';

export function createMessageHandler(api: PluginAPI, validate: (value: unknown) => ValidationResult = validateSpec) {
  async function handle(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string') return;
    const id = message.id;
    try {
      if (!('type' in message)) throw new Error('Missing message type');
      if (message.type === 'status') {
        api.ui.postMessage({ id, ok: true, result: { connected: true, file: api.root.name, page: api.currentPage.name } });
        return;
      }
      let payload: unknown;
      if (message.type === 'render_ideas') payload = 'payload' in message ? message.payload : undefined;
      else if (message.type === 'paste_json') {
        if (!('json' in message) || typeof message.json !== 'string') throw new Error('Paste a JSON object with hmw and ideas');
        try { payload = JSON.parse(message.json); } catch { throw new Error('Invalid JSON. Paste a JSON object with hmw and ideas.'); }
      } else throw new Error(`Unknown message type: ${String(message.type)}`);
      const validated = validate(payload);
      if (!validated.success) { api.ui.postMessage({ id, ok: false, errors: validated.errors }); return; }
      const result = await renderIdeas(api, validated.data);
      api.ui.postMessage({ id, ok: true, result });
      api.notify(`Created ${result.ideaCount} ideas and ${result.screenCount} wireframes`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      api.ui.postMessage({ id, ok: false, errors: [detail] });
      api.notify(`HMW Diverger: ${detail}`, { error: true });
    }
  }
  // Concurrent bridge and Paste JSON requests share a queue, keeping placement deterministic.
  let pending = Promise.resolve();
  return (message: unknown): Promise<void> => { pending = pending.then(() => handle(message)); return pending; };
}

if (typeof figma !== 'undefined') {
  figma.showUI(__html__, { width: 440, height: 680, themeColors: true });
  figma.ui.onmessage = createMessageHandler(figma);
}
