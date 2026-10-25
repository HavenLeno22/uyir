import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Emits sw.js with the list of every built file (so screens that load on demand are cached on
 * the first visit too) and a version taken from the hashed file names (so a new build replaces
 * the old cache).
 */
function serviceWorker(): Plugin {
  return {
    name: 'uyir-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => f !== 'index.html' && !f.endsWith('.map'))
        .sort();
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync('sw/sw.js', 'utf8')
        .replace("const VERSION = '__VERSION__';", `const VERSION = 'uyir-${version}';`)
        .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(files.map((f) => `./${f}`))};`);
      if (source.includes('__')) this.error('sw/sw.js: a placeholder was not filled in');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// `base: './'` keeps asset paths relative, so the built `dist/` folder works on
// GitHub Pages (e.g. havenleno22.github.io/uyir/) or any static host.
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
