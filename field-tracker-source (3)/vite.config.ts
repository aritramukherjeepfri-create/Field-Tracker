import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the built assets resolve correctly regardless of
  // where the site is served from — critical for GitHub Pages, which
  // serves project sites from a sub-path (yourname.github.io/repo/)
  // rather than the domain root. Works equally well for Netlify or any
  // other static host, since the app has no client-side routing (it's
  // a single index.html with in-app tab state, not URL-based routes).
  base: './',
})
