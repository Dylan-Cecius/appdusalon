import path from 'node:path';
import { preview } from 'vite';
import { buildMobileDemo, repositoryRoot } from './build-demo.mjs';

await buildMobileDemo();
const server = await preview({
  configFile: false,
  envFile: false,
  root: path.join(repositoryRoot, 'mobile'),
  publicDir: false,
  build: { outDir: path.join(repositoryRoot, 'dist-mobile-demo') },
  preview: { host: '127.0.0.1', port: 4180, strictPort: true, open: false },
});
server.printUrls();
