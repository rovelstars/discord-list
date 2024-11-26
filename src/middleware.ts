import '@/lib/console-log';
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((_context, next) => {
  return next();
});