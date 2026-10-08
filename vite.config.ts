import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // `vite build --mode pages` builds the demo app (index.html) for GitHub Pages
  // instead of the web-component library.
  const isPages = mode === 'pages';

  return {
    base: isPages ? (process.env.PAGES_BASE || '/modernRtiViewer/') : '/',
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
    build: isPages
      ? { outDir: 'dist-pages' }
      : {
          lib: {
            entry: resolve(__dirname, 'src/lib.ts'),
            name: 'ModernRtiViewer',
            fileName: (format: string) => `modern-rti-viewer.${format}.js`,
          },
        },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  };
});
