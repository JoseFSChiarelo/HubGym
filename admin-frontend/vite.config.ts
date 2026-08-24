import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: './', // necessário para carregar assets via file:// no Electron build
  plugins: [react()]
});
