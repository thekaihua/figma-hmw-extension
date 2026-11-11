const { build } = require('esbuild');
const { readFileSync, mkdirSync, writeFileSync, watch } = require('node:fs');

async function bundle() {
  const ui = await build({ entryPoints: ['src/ui/connection.ts'], bundle: true,
    write: false, format: 'iife', platform: 'browser', target: 'es2017' });
  const script = ui.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = readFileSync('src/ui/ui.html', 'utf8').replace('__UI_SCRIPT__', () => script);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/ui.html', html);
  await build({ entryPoints: ['src/code.ts'], outfile: 'dist/code.js', bundle: true,
    format: 'iife', platform: 'neutral', target: 'es2017',
    define: { __html__: JSON.stringify(html) } });
}

bundle().catch(error => { console.error(error); process.exitCode = 1; });
if (process.argv.includes('--watch')) {
  let timer;
  let pending = Promise.resolve();
  for (const path of ['src', '../shared']) watch(path, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { pending = pending.then(bundle).catch(console.error); }, 80);
  });
}
