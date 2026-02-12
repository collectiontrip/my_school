import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.137.1',   // ✅ hotspot wali IP
    port: 5173,
    strictPort: true
  }
})