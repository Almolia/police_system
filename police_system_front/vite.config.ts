/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true, // Allows us to use describe/it/expect without importing them every time
    environment: 'jsdom', // Simulates a browser environment for React
    setupFiles: './src/setupTests.ts',
  },
})