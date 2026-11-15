// @ts-check
import { defineConfig } from 'astro/config';

const base = '/projektarbeit-microsite';

// https://astro.build/config
export default defineConfig({
  site: 'https://guendeti.github.io',
  base,
  output: 'static',
});
