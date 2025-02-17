import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({
    "name": "Rovel Discord List",
    "icons": [
      {
        "src": "assets/img/bot/logo-36.png",
        "sizes": "36x36",
        "type": "image/png"
      },
      {
        "src": "assets/img/bot/logo-48.png",
        "sizes": "48x48",
        "type": "image/png"
      },
      {
        "src": "assets/img/bot/logo-72.png",
        "sizes": "72x72",
        "type": "image/png"
      },
      {
        "src": "assets/img/bot/logo-96.png",
        "sizes": "96x96",
        "type": "image/png"
      },
      {
        "src": "assets/img/bot/logo-144.png",
        "sizes": "144x144",
        "type": "image/png"
      },
      {
        "src": "assets/img/bot/logo-192.png",
        "sizes": "192x192",
        "type": "image/png"
      }
    ],
    "theme_color": "#5865F2",
    "background_color": "#36393F",
    "start_url": "/",
    "display": "standalone",
    "orientation": "any"
  }),{
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};