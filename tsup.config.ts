import { defineConfig, type Options } from 'tsup';

const extensionConfig: Options = {
  entry: {
    background: 'src/background.ts',
    content: 'src/content.ts',
    timer: 'src/timer.ts',
  },

  outDir: './dist/extension',
  format: ['iife'],
  platform: 'browser',
  target: 'es2020',

  outExtension({ format }) {
    if (format === 'iife') return { js: '.js' };
    return {};
  },

  minify: true,
  minifyIdentifiers: false,
  keepNames: true,

  sourcemap: false,
  clean: true,
  dts: false,

  onSuccess: 'node scripts/copy-extension-assets.mjs',
};

export default defineConfig(() => extensionConfig);
