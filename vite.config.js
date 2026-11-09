import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — чтобы билд работал по любому адресу (GitHub Pages, подпапка репозитория)
export default defineConfig({
  base: './',
  plugins: [react()],
});
