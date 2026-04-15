import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/public': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
