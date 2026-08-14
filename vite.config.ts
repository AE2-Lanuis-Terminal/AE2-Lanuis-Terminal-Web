import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Tauri 自定义协议下相对资源路径更稳妥
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@vue-flow') || id.includes('d3-')) return 'vue-flow'
          if (id.includes('reka-ui') || id.includes('@floating-ui')) return 'reka'
          if (id.includes('@tauri-apps')) return 'tauri'
          if (id.includes('vue-i18n') || id.includes('@intlify')) return 'i18n'
          if (id.includes('axios')) return 'axios'
          if (id.includes('node_modules/vue/') || id.includes('node_modules\\vue\\') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vue-vendor'
          }
        },
      },
    },
  },
})
