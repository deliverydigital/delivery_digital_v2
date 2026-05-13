import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyConfig = {
  '/api': {
    target: 'http://127.0.0.1:3008',
    changeOrigin: true,
    secure: false,
  },
  '/sitemap.xml': {
    target: 'http://127.0.0.1:3008',
    changeOrigin: true,
    secure: false,
  },
  '/llms.txt': { target: 'http://127.0.0.1:3008', changeOrigin: true, secure: false },
  '/llms-full.txt': { target: 'http://127.0.0.1:3008', changeOrigin: true, secure: false },
  '/robots.txt': {
    target: 'http://127.0.0.1:3008',
    changeOrigin: true,
    secure: false,
  },
  '/devis': {
    target: 'http://127.0.0.1:3008',
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: { proxy: proxyConfig },
  preview: { proxy: proxyConfig },
});
