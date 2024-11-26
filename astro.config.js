import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';

import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

import db from '@astrojs/db';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind({
    applyBaseStyles: false,
  }), react(), db()],

  output: 'server',
  adapter: cloudflare(),
  vite: {
    ssr: {
      external: ['node:buffer', 'node:path', 'node:crypto', 'node:https', 'node:http', 'https', 'http', 'zlib', 'events'],
    },
  },
});