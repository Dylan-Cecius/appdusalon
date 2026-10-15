import { startVitest } from 'vitest/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const filters = process.argv.slice(2);
const context = await startVitest('test', filters.length ? filters : ['src'], {
  run: true,
  root,
  config: path.join(root, 'vite.config.ts'),
}, { envFile: false });
if (!context) throw new Error('Unit test runner failed to start.');
await context.close();
