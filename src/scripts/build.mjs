/**
 * build.mjs — construye _dist con esbuild. Es el ÚNICO paso que necesita Node.
 *
 * Qué hace:
 *   1. borra _dist y lo crea limpio
 *   2. empaqueta src/css/app.css  →  _dist/css/app.css   (sigue los @import)
 *   3. empaqueta src/js/main.tsx  →  _dist/js/main.js    (formato ESM)
 *   4. escribe _dist/build-meta.json con el tamaño y una huella del resultado
 *
 * Detalle clave: React queda como "externo". No se empaqueta: en tiempo de
 * ejecución lo trae el navegador desde el CDN, usando la lista de equivalencias
 * del HTML. Así el paquete pesa kilobytes y no cientos.
 *
 * Uso:
 *   node src/scripts/build.mjs              → minificado (para publicar)
 *   node src/scripts/build.mjs --no-minify  → legible (para depurar en vivo)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(root, '_dist');
const minify = !process.argv.includes('--no-minify');

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'js'), { recursive: true });
mkdirSync(join(dist, 'css'), { recursive: true });

const css = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/css/app.css'],
  bundle: true,
  outfile: join(dist, 'css', 'app.css'),
  minify,
  metafile: true,
  logLevel: 'info',
});

const js = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/js/main.tsx'],
  bundle: true,
  format: 'esm',
  outfile: join(dist, 'js', 'main.js'),
  minify,
  sourcemap: true,
  target: 'es2022',
  jsx: 'automatic',
  legalComments: 'none',
  // React NO se empaqueta: llega del CDN por la lista de equivalencias
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
  define: { 'process.env.NODE_ENV': minify ? '"production"' : '"development"' },
  metafile: true,
  logLevel: 'info',
});

const cssOut = readFileSync(join(dist, 'css', 'app.css'));
const jsOut = readFileSync(join(dist, 'js', 'main.js'));
const bytesIn =
  Object.values(css.metafile.inputs).reduce((s, i) => s + i.bytes, 0) +
  Object.values(js.metafile.inputs).reduce((s, i) => s + i.bytes, 0);

const meta = {
  builtAt: new Date().toISOString(),
  minify,
  entry: ['src/css/app.css', 'src/js/main.tsx'],
  bytesIn,
  bytesOut: cssOut.byteLength + jsOut.byteLength,
  hash: createHash('sha256').update(jsOut).update(cssOut).digest('hex').slice(0, 12),
  outputs: ['_dist/css/app.css', '_dist/js/main.js'],
};
writeFileSync(join(dist, 'build-meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(
  `OK _dist  ${minify ? 'minificado' : 'sin minificar'}  ` +
    `${kb(meta.bytesIn)} → ${kb(meta.bytesOut)}  hash=${meta.hash}`,
);
