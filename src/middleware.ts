import '@/lib/console-log';
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  return next();
});