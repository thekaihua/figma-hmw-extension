import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test, vi } from 'vitest';
import { spec } from '../../shared/fixtures';
import { fakeFigma } from './fakeFigma';

test('build bundles the UI and renders in a sandbox with dynamic evaluation disabled', async () => {
  execFileSync(process.execPath, ['build.js'], { cwd: process.cwd() });
  const code = readFileSync('dist/code.js', 'utf8');
  const html = readFileSync('dist/ui.html', 'utf8');
  expect(code).toContain('<!DOCTYPE html>');
  expect(code).toContain('Waiting for bridge');
  expect(html).toContain('<script>');
  expect(html).not.toContain('__UI_SCRIPT__');
  expect(html).toContain('localhost:3055');
  const { api, fake } = fakeFigma();
  const dynamicFunction = vi.fn(() => { throw new Error('Dynamic evaluation is forbidden'); });
  runInNewContext(code, { figma: api, Function: dynamicFunction }, { contextCodeGeneration: { strings: false, wasm: false } });
  expect(fake.showUI).toHaveBeenCalledWith(html, expect.objectContaining({ themeColors: true }));
  await fake.ui.onmessage!({ id: 'bundle:1', type: 'render_ideas', payload: spec });
  expect(fake.ui.postMessage).toHaveBeenCalledWith({ id: 'bundle:1', ok: true, result: expect.objectContaining({ ideaCount: 1 }) });
  expect(dynamicFunction).not.toHaveBeenCalled();
});
