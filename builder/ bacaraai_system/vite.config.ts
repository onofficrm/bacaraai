import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const isAdmin = process.env.BUILD_TARGET === 'admin';

  return {
    base: isProd
      ? isAdmin
        ? '/plugin/onoff-builder-bridge/imports/bacaraai-admin/'
        : '/plugin/onoff-builder-bridge/imports/bacaraai-system/'
      : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: isAdmin ? 'dist-admin' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isAdmin
          ? path.resolve(__dirname, 'admin.html')
          : path.resolve(__dirname, 'index.html'),
      },
      // admin.html → index.html 로 배포 (imports/bacaraai-admin/)
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
