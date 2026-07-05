import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/docs': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib.ts'),
      name: 'ModernRtiViewer',
      fileName: (format) => `modern-rti-viewer.${format}.js`,
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
