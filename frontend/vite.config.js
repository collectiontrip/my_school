import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.137.1', // LAN IP
    port: 5173,
    strictPort: true,
    https: {
      key: fs.readFileSync('./192.168.137.1-key.pem'),
      cert: fs.readFileSync('./192.168.137.1.pem'),
    }
  }
});