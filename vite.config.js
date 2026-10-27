import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:https` uses mode "https": a self-signed certificate so the
// in-app camera scanner (/scan) also works on your phone over Wi-Fi.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: true, // reachable from your phone on the same Wi-Fi
    port: 5173,
  },
}))
