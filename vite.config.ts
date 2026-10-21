import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  server: {
    // The CDK app's build output holds locked zip files on Windows, which crashes the watcher.
    watch: { ignored: ['**/infra/**'] },
  },
});
