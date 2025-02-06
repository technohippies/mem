import { defineConfig } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    name: 'minimal',
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
    },
    apple: {
      sizes: [180],
    },
  },
  images: ['public/logo.png'],
}); 