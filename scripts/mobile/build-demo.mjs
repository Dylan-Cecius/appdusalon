import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react-swc';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

// A future accidental import of a connected screen must fail this build.
export function assertDemoModuleGraph(moduleIds) {
  const forbidden = moduleIds.filter(id => {
    const normalized = id.replaceAll('\\', '/').split('?')[0];
    return /\/(?:node_modules\/@supabase|src\/integrations|src\/native|supabase)\//.test(normalized)
      || /\/src\/(?:App|main)\.tsx$/.test(normalized);
  });
  if (forbidden.length) {
    throw new Error(`Mobile demo includes connected application modules:\n${forbidden.join('\n')}`);
  }
}

export async function buildMobileDemo({ outDir = path.join(repositoryRoot, 'dist-mobile-demo'), logLevel = 'info' } = {}) {
  return build({
    root: path.join(repositoryRoot, 'mobile'),
    configFile: false,
    // InlineConfig.envFile=false also excludes inherited VITE_* variables.
    // Do not load the tracked .env, .env.local or any mode-specific env file.
    envFile: false,
    mode: 'mobile-demo',
    base: './',
    publicDir: false,
    logLevel,
    define: {
      'import.meta.env.VITE_PREVIEW_STANDALONE': JSON.stringify('true'),
      'import.meta.env.VITE_PREVIEW_DEMO_ONLY': JSON.stringify('true'),
    },
    resolve: { alias: { '@': path.join(repositoryRoot, 'src') } },
    css: { postcss: repositoryRoot },
    plugins: [react(), {
      name: 'mobile-demo-boundary',
      generateBundle() { assertDemoModuleGraph([...this.getModuleIds()]); },
    }],
    build: {
      outDir,
      emptyOutDir: true,
      target: 'safari14',
      modulePreload: { polyfill: false },
      manifest: true,
      sourcemap: false,
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildMobileDemo();
}
