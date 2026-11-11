import { build } from 'esbuild';
import { chmodSync } from 'node:fs';

await build({
  entryPoints: ['src/index.ts'], outfile: 'dist/index.js', bundle: true,
  platform: 'node', target: 'node22', format: 'esm', packages: 'external',
  banner: { js: '#!/usr/bin/env node' },
});
chmodSync('dist/index.js', 0o755);
