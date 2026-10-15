import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

// Compilation only: do not execute this connected app or package it for iOS.
const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = await mkdtemp(path.join(tmpdir(), 'appdusalon-connected-check-'));
try {
  await build({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    envFile: false,
    mode: 'mobile-compile-check',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://mobile-check.invalid'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-not-a-real-key'),
      'import.meta.env.VITE_PREVIEW_STANDALONE': JSON.stringify('false'),
      'import.meta.env.VITE_PREVIEW_DEMO_ONLY': JSON.stringify('false'),
    },
    build: { outDir, emptyOutDir: true, target: 'safari14', sourcemap: false },
  });
  console.log('Connected source compiled with synthetic configuration; temporary output removed next. No backend or native runtime tested.');
} finally {
  await rm(outDir, { recursive: true, force: true });
}
