import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/fliptext-studio/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['openscad-wasm-prebuilt'],
  },
})
