import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    minify: false,
    terserOptions: {
      compress: false,
      mangle: false,
    },
  },
})