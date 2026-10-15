import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildMobileDemo, repositoryRoot } from './build-demo.mjs';

// Always rebuild the isolated entry. Never copy a stale normal web build.
await buildMobileDemo();
const nativeRoot = path.join(repositoryRoot, 'ios-demo');
const cli = path.join(repositoryRoot, 'node_modules/@capacitor/cli/bin/capacitor');
const args = existsSync(nativeRoot) ? ['sync', 'ios'] : ['add', 'ios', '--packagemanager', 'SPM'];
const result = spawnSync(process.execPath, [cli, ...args], {
  cwd: repositoryRoot,
  env: { ...process.env, CI: '1', APPDUSALON_MOBILE_TARGET: 'demo' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Capacitor preparation failed (${result.status ?? result.signal}).`);

const nativeConfig = JSON.parse(await readFile(path.join(nativeRoot, 'App/App/capacitor.config.json'), 'utf8'));
const copiedHtml = await readFile(path.join(nativeRoot, 'App/App/public/index.html'), 'utf8');
assert.equal(nativeConfig.appName, 'AppDuSalon Demo');
assert.ok(nativeConfig.appId.endsWith('.demo'));
assert.equal(nativeConfig.webDir, 'dist-mobile-demo');
assert.equal(nativeConfig.server?.url, undefined);
assert.notEqual(nativeConfig.server?.cleartext, true);
assert.match(copiedHtml, /appdusalon-build" content="mobile-demo/);
assert.match(copiedHtml, /connect-src 'none'/);
console.log('iOS demo project prepared with isolated bundled assets. No native compilation or signing performed.');
