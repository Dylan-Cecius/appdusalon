import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assertDemoModuleGraph, buildMobileDemo } from './build-demo.mjs';

test('a connected module accidentally imported into the demo fails closed', () => {
  for (const id of [
    '/project/src/integrations/supabase/client.ts',
    '/project/node_modules/@supabase/supabase-js/dist/module/index.js',
    'C:\\project\\src\\App.tsx',
    '/project/src/main.tsx',
    '/project/src/native/NativeAuthBridge.tsx',
  ]) assert.throws(() => assertDemoModuleGraph([id]), /connected application modules/);
  assert.doesNotThrow(() => assertDemoModuleGraph(['/project/src/components/agenda/PreviewAgenda.tsx']));
});

test('the built demo stays offline even when the shell supplies backend configuration', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'appdusalon-demo-build-'));
  const poison = {
    VITE_PREVIEW_STANDALONE: 'false',
    VITE_PREVIEW_DEMO_ONLY: 'false',
    VITE_SUPABASE_URL: 'https://must-never-ship.example.invalid',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'must-never-ship-key',
    VITE_NATIVE_AUTH_ENABLED: 'true',
    VITE_NATIVE_AUTH_REDIRECT_URL: 'com.example.must-never-ship://auth/callback',
  };
  const previous = Object.fromEntries(Object.keys(poison).map(key => [key, process.env[key]]));
  Object.assign(process.env, poison);
  try {
    await buildMobileDemo({ outDir, logLevel: 'warn' });
    const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /appdusalon-build" content="mobile-demo/);
    assert.match(html, /lang="fr"/);
    assert.doesNotMatch(html, /(?:src|href)="https?:/);
    const files = await readdir(path.join(outDir, 'assets'));
    const text = (await Promise.all(files.map(file => readFile(path.join(outDir, 'assets', file), 'utf8')))).join('\n');
    assert.doesNotMatch(text, /must-never-ship|supabase\.co|\/auth\/v1|\/rest\/v1/);
    assert.match(text, /Démonstration/);
    assert.ok(files.some(file => file.endsWith('.css')), 'the demo includes its local styles');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(outDir, { recursive: true, force: true });
  }
});
