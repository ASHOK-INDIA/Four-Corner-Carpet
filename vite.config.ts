import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.rs/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
