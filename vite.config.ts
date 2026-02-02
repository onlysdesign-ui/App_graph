import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: isGithubPages ? '/App_graph/' : '/',
});
