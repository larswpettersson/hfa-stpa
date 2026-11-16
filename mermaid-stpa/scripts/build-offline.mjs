// Builds demo/index.offline.html: a single self-contained file that works
// from file:// without network (mermaid + plugin + bootstrap all inlined).
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

const common = { bundle: true, format: 'iife', minify: true, write: false, legalComments: 'none' };

// Mermaid loads every built-in diagram type, the ELK/cytoscape layouts and
// KaTeX through dynamic import(). The STPA diagram needs none of them, so
// they are replaced with a stub that throws. This takes mermaid from ~5 MB
// (mermaid.min.js) to ~0.6 MB. Only STPA diagrams render in the result.
const stubDynamicImports = {
  name: 'stub-dynamic-imports',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (a) =>
      a.kind === 'dynamic-import' && a.importer.includes('node_modules')
        ? { path: a.path, namespace: 'stub' }
        : undefined,
    );
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
      contents: `throw new Error(${JSON.stringify(`not included in offline build: ${a.path}`)});`,
      loader: 'js',
    }));
  },
};

const [mermaid, plugin] = await Promise.all([
  build({
    ...common,
    stdin: { contents: "import m from 'mermaid'; window.mermaid = m;", resolveDir: root.pathname },
    plugins: [stubDynamicImports],
  }),
  build({ ...common, entryPoints: [new URL('src/index.ts', root).pathname], globalName: 'mermaidStpa' }),
]).then((rs) => rs.map((r) => r.outputFiles[0].text));
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
