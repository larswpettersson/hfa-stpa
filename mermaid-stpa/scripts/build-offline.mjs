// Builds demo/index.offline.html: a single self-contained file that works
// from file:// without network (mermaid + plugin + bootstrap all inlined).
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

const { outputFiles } = await build({
  entryPoints: [new URL('src/index.ts', root).pathname],
  bundle: true,
  format: 'iife',
  globalName: 'mermaidStpa',
  minify: true,
  write: false,
});
const plugin = outputFiles[0].text;
const mermaid = await read('node_modules/mermaid/dist/mermaid.min.js');
const html = await read('demo/index.html');

const boot = `(async () => {
  await mermaid.registerExternalDiagrams([mermaidStpa.default]);
  const dark = new URLSearchParams(location.search).has('dark');
  if (dark) document.body.classList.add('dark');
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' });
  await mermaid.run();
  document.body.dataset.done = '1';
})();`;

const safe = (s) => s.replaceAll('</script', '<\\/script');
const inline = [mermaid, plugin, boot].map((s) => `<script>${safe(s)}</script>`).join('\n');

const out = html.replace(/<script type="module">[\s\S]*?<\/script>/, () => inline);
if (out === html) throw new Error('module <script> block not found in demo/index.html');

await writeFile(new URL('demo/index.offline.html', root), out);
console.log(`wrote demo/index.offline.html (${(out.length / 1e6).toFixed(1)} MB)`);
