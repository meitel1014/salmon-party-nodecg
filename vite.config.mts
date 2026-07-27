import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import nodecg from './vite-plugin-nodecg.mts';
import { nodecgSchemas } from './vite-plugin-nodecg-schemas.mts';
import rollupEsbuild from 'rollup-plugin-esbuild';
import rollupExternals from 'rollup-plugin-node-externals';
import { BUNDLE_NAME } from './bundleName';

// dev サーバー（Vite）のポート。NodeCG(9090) が配信する HTML はここへスクリプトを
// 読みに行くため、生成される origin と実際の Vite の待受ポートが一致している必要がある。
// 既定の 8080 は他アプリ（WSL mirrored 環境の Windows 側 Express 等）と衝突しやすいので固定。
const DEV_SERVER_PORT = 6080;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // strictPort: ポートが埋まっていたら黙って +1 せずエラーで停止させる。
  // 黙ってズレると HTML(origin) と実ポートが食い違い、パネルが空白になるため。
  server: {
    strictPort: true,
  },
  plugins: [
    react(),
    nodecg({
      bundleName: BUNDLE_NAME,
      graphics: './src/browser/graphics/*/index.tsx',
      dashboard: './src/browser/dashboard/*/index.tsx',
      extension: {
        input: './src/extension/index.ts',
        plugins: [rollupEsbuild(), rollupExternals()],
      },
      server: { port: DEV_SERVER_PORT },
    }),
    nodecgSchemas(),
  ]
});
