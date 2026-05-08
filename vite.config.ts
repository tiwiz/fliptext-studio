import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fliptext-studio/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['openscad-wasm-prebuilt'],
  },
}))
