import path from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function appVersion(): string {
  const sha = process.env.GITHUB_SHA?.slice(0, 7)
  if (sha) return sha
  try {
    return `${execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}-dev`
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites serve from /<repo>/, not the domain root.
  base: process.env.GITHUB_ACTIONS ? '/Aula-F75-Max-Web/' : '/',
  plugins: [react(), tailwindcss()],
  define: {
    // Shown in copied activity logs so bug reports say which build they came from.
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
