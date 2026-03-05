import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";

/**
 * Shape of the authenticated user object returned by /api/auth/me.
 * Matches what the old +layout.server.ts used to return.
 */
export type AuthUser = {
	id: string;
	username: string;
	tag: string;
	discriminator: string;
	avatar: string | null;
	bal: number;
};

type AuthState = {
	/** null = not yet resolved, true/false once resolved */
	loading: boolean;
	/** The resolved user, or null if not logged in / fetch failed */
	user: AuthUser | null;
	/** Whether we've completed the initial fetch */
	resolved: boolean;
};

const initial: AuthState = { loading: true, user: null, resolved: false };

/**
 * Internal writable – components should use the derived exports below.
 */
const _auth = writable<AuthState>(initial);

/** Whether the auth check is still in-flight. */
export const authLoading = derived(_auth, ($a) => $a.loading);

/** The authenticated user (null when logged out or still loading). */
export const authUser = derived(_auth, ($a) => $a.user);

/** True once the initial auth check has completed (success or failure). */
export const authResolved = derived(_auth, ($a) => $a.resolved);

// ---------------------------------------------------------------------------
// Fetch logic – runs at most once per page-load session
// ---------------------------------------------------------------------------

let fetchPromise: Promise<void> | null = null;

/**
 * Kick off the client-side auth resolution.
 *
 * Safe to call multiple times – only the first call actually fetches.
 * Subsequent calls return the same promise.
 *
 * @param hasAuthCookie  Optional hint from the server (via +layout.server.ts)
 *   indicating whether a `key` cookie is present. When explicitly `false` we
 *   skip the fetch entirely and resolve as logged-out, saving a round-trip.
 */
export function initAuth(hasAuthCookie?: boolean): Promise<void> {
	if (!browser) return Promise.resolve();

	// If the server already told us there's no cookie, short-circuit.
	if (hasAuthCookie === false) {
		_auth.set({ loading: false, user: null, resolved: true });
		return Promise.resolve();
	}

	if (fetchPromise) return fetchPromise;

	fetchPromise = _fetchUser();
	return fetchPromise;
}

async function _fetchUser(): Promise<void> {
	try {
		const res = await fetch("/api/auth/me", {
			credentials: "same-origin",
			headers: { Accept: "application/json" }
		});

		if (!res.ok) {
			_auth.set({ loading: false, user: null, resolved: true });
			return;
		}

		const data: AuthUser | null = await res.json();

		if (data && data.id) {
			_auth.set({ loading: false, user: data, resolved: true });
		} else {
			_auth.set({ loading: false, user: null, resolved: true });
		}
	} catch {
		// Network error / offline – treat as logged out
		_auth.set({ loading: false, user: null, resolved: true });
	}
}

/**
 * Force a re-fetch of the current user. Useful after login/logout
 * so the navbar updates without a full page reload.
 */
export function refreshAuth(): Promise<void> {
	fetchPromise = null;
	_auth.set({ loading: true, user: null, resolved: false });
	return initAuth();
}

/**
 * Immediately set the auth state to logged-out.
 * Called after a logout POST so the UI updates instantly
 * without waiting for a round-trip to /api/auth/me.
 */
export function clearAuth(): void {
	fetchPromise = null;
	_auth.set({ loading: false, user: null, resolved: true });
}
