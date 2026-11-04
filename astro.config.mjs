// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const base = '/projektarbeit-microsite';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx()],
  site: 'https://guendeti.github.io',
  base,
  output: 'static',
});
