import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: si el repositorio en GitHub se llama distinto a "algoritmo-fca",
// cambia este valor por '/<nombre-del-repositorio>/'.
// Si algún día publicas en un dominio propio, ponlo en '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/algoritmo-fca/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
