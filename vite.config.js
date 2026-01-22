import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose on all network interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.111.1.75000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy
      },
      '/socket.io': {
        target: 'http://192.168.111.1/:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      host: '192.168.111.1', 
      port: 5173,
      protocol: 'ws',
      clientPort: 5173,
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://192.168.111.1:5000'),
  },
});