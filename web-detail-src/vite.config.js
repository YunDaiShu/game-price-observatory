import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    // 直接产出到主站仓库，与静态页同一次 Pages 部署
    outDir: 'E:/AAA DeepWork/game-price-radar/docs/detail',
    emptyOutDir: true
  }
});
