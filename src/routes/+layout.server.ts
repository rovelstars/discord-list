import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
	// Instead of resolving the full user via Discord OAuth + DB on every
	// server-side page load (which blocks the response and prevents caching),
	// we only pass a lightweight boolean hint to the client.
	//
	// The client-side auth store ($lib/auth.ts) uses this hint:
	//   - false → skip the /api/auth/me fetch entirely (no cookie = no user)
	//   - true  → fire a single client-side fetch to /api/auth/me to resolve
	//             the user asynchronously after first paint
	//
	// This means ALL pages (except /dashboard/**) can be served from cache
	// regardless of whether the visitor is logged in or not. The navbar and
	// other auth-dependent UI elements render a skeleton/placeholder state
	// during the brief async resolution.
	const hasAuthCookie = !!cookies.get("key");

	return { hasAuthCookie };
};
