import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
const site = process.env.SITE_URL;
export default defineConfig({
  ...(site ? { site } : {}),
  integrations: [react(), ...(site ? [sitemap()] : [])],
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
