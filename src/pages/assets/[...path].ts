// redirect all requests to the assets route to root /

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request }) => {
  const url = new URL(request.url);//remote /assets/ from the url
  return Response.redirect(new URL(url.pathname.replace("/assets/", "/"), url.origin).toString(), 301);
}