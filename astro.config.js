import { defineConfig, envField } from 'astro/config';

import tailwind from '@astrojs/tailwind';

import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

import db from '@astrojs/db';

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  prefetch:{
    prefetchAll: true,
    defaultStrategy: "viewport"
  },
  env: {
    
    schema: {
      DISCORD_BOT_ID: envField.string({ context: "server", access: "public", optional: false }),
      DISCORD_PUBLIC_KEY: envField.string({ context: "server", access: "public", optional: false }),
      DOMAIN: envField.string({ context: "server", access: "public", optional: false }),
      DOWNLOAD_PASS: envField.string({ context: "server", access: "secret", optional: false }),
      HTTPS: envField.string({ context: "server", access: "public", optional: false, default: "true" }),
      BOT_PREFIX: envField.string({ context: "server", access: "public", optional: false }),
      DISCORD_SECRET: envField.string({ context: "server", access: "secret", optional: false }),
      SELFBOT_TOKEN: envField.string({ context: "server", access: "secret", optional: false }),
      SENTRY: envField.string({ context: "server", access: "secret", optional: false }),
      DISCORD_TOKEN: envField.string({ context: "server", access: "secret", optional: false }),
      TOPTOKEN: envField.string({ context: "server", access: "secret", optional: false }),
      VOIDTOKEN: envField.string({ context: "server", access: "secret", optional: false }),
      WEBHOOK: envField.string({ context: "server", access: "secret", optional: false }),
      DISCORD_GUILD_ID: envField.string({ context: "server", access: "public", optional: false }),
      MODE: envField.string({ context: "server", access: "public", optional: false, default: "development" }),
      LOGS_CHANNEL_ID: envField.string({ context: "server", access: "public", optional: false }),
      FAILED_DMS_LOGS_CHANNEL_ID: envField.string({ context: "server", access: "public", optional: false }),
    }
  },
  integrations: [tailwind({
    applyBaseStyles: false,
  }), react(), db()],

  output: 'server',
  adapter: netlify(),
  vite: {
    ssr: {
      external: ["buffer", "path", "fs", "os", "crypto", "async_hooks", "https", "http", "zlib", "events"].flatMap((i) => [`node:${i}`, i]),
    },
  },
});