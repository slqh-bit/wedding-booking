import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the workspace shared package source; keep node_modules external.
  noExternal: ['@hafalati/shared'],
  splitting: false,
});
