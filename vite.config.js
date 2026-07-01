import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/docs': {
        target: 'http://localhost:5174',
        changeOrigin: true
      }
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib.js'),
      name: 'ModernRtiViewer',
      fileName: (format) => `modern-rti-viewer.${format}.js`
    }
    // Note: We deliberately do not externalize Vue or Three.js 
    // to ensure the resulting Web Component is 100% standalone and zero-dependency
    // for easy drop-in embedding on any website.
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
