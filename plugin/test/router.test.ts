import { expect, test, vi } from 'vitest';
import { createMessageHandler } from '../src/code';
import { spec } from '../../shared/fixtures';
import { validateSpec } from '../../shared/spec';
import { fakeFigma } from './fakeFigma';

test('validates, renders and replies with the request id', async () => {
  const { fake, api } = fakeFigma(); const handler = createMessageHandler(api);
  await handler({ id: 'render:1', type: 'render_ideas', payload: spec });
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'render:1', ok: true, result: expect.objectContaining({ ideaCount: 1, screenCount: 1 }) });
  expect(fake.currentPage.children).toHaveLength(1);
});
test('invalid payloads draw nothing and return paths', async () => {
  const { fake, api } = fakeFigma();
  await createMessageHandler(api)({ id: 'bad', type: 'render_ideas', payload: { ...spec, ideas: [{}] } });
  expect(fake.currentPage.children).toHaveLength(0);
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'bad', ok: false, errors: expect.arrayContaining([expect.stringContaining('ideas[0].title')]) });
});
test('status returns the file and page', async () => {
  const { fake, api } = fakeFigma(); await createMessageHandler(api)({ id: 'status', type: 'status' });
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'status', ok: true, result: { connected: true, file: 'Budget playground', page: 'Ideas' } });
});
test('render errors are reported and notified without crashing the handler', async () => {
  const { fake, api } = fakeFigma(); fake.loadFontAsync.mockRejectedValueOnce(new Error('Font unavailable'));
  const handler = createMessageHandler(api);
  await handler({ id: 'error', type: 'render_ideas', payload: spec });
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'error', ok: false, errors: ['Font unavailable'] });
  expect(fake.notify).toHaveBeenCalledWith(expect.stringContaining('Font unavailable'), { error: true });
  await handler({ id: 'next', type: 'render_ideas', payload: spec });
  expect(fake.currentPage.children).toHaveLength(1);
});
test('Paste JSON uses the same validation and rendering path', async () => {
  const { fake, api } = fakeFigma(); const validate = vi.fn(validateSpec);
  const handler = createMessageHandler(api, validate);
  await handler({ id: 'paste', type: 'paste_json', json: JSON.stringify(spec) });
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'paste', ok: true, result: expect.objectContaining({ ideaCount: 1 }) });
  await handler({ id: 'syntax', type: 'paste_json', json: '{' });
  expect(fake.ui.postMessage).toHaveBeenLastCalledWith({ id: 'syntax', ok: false, errors: [expect.stringContaining('Invalid JSON')] });
  expect(fake.currentPage.children).toHaveLength(1);
  expect(validate).toHaveBeenCalledExactlyOnceWith(spec);
});
test('serializes simultaneous renders so each goes beside existing content', async () => {
  const { fake, api } = fakeFigma(); const handler = createMessageHandler(api);
  await Promise.all(['a', 'b'].map(id => handler({ id, type: 'render_ideas', payload: spec })));
  const [first, second] = fake.currentPage.children;
  expect(second.x).toBeGreaterThan(first.x + first.width);
});
