// This file intentionally contains no logic.
//
// SvelteKit only registers a route in the client-side router manifest when
// there is at least one non-server module in the route segment. Without this
// file, the route only has a +page.server.ts, which makes SvelteKit treat it
// as SSR-only - CSR navigations update the URL but never fetch or render the
// page content.
//
// Exporting the standard page options here is enough to register the segment
// in the client manifest and let SvelteKit hydrate it normally on CSR.

export const ssr = true;
export const csr = true;
