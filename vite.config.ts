import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed as a GitHub *user page* (repo named "hassanireza.github.io"),
// which is always served from the domain root: https://hassanireza.github.io/
// So base stays "/" for both dev and production. (If this ever moves back
// to a project-page repo, e.g. "hassanireza/portfolio", set this to
// "/<repo-name>/" for the build case and update public/404.html to match.)
export default defineConfig({
  plugins: [react()],
  base: '/',
})
