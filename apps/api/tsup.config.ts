import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  // The shared package ships TypeScript source, so it is bundled rather than
  // left as a runtime import the deployed container could not resolve.
  noExternal: ['@task-manager/shared'],
});
