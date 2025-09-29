import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // Aquí puedes poner el contenido de tu manifest.json si prefieres
        // o dejar que lo lea desde el archivo.
      }
    })
  ],
})