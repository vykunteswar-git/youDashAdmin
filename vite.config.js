import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // API only under /admin — do NOT proxy /orders (conflicts with React route /orders).
      '/admin': {
        target: 'https://youdashexpress.com',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'https://youdashexpress.com',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
})
