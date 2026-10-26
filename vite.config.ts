import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/api/weather` is `src/api/weather`. Kept in step with `paths` in tsconfig.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
