/**
 * theme-store.ts
 *
 * Reactive store for the two independent theme dimensions:
 *   • mode   – "light" | "dark" | "system"
 *   • accent – one of the THEME_IDS from theme.ts
 *
 * Both are persisted to:
 *   1. localStorage  (fast sync on same tab / next visit)
 *   2. A cookie      (read by hooks.server.ts so SSR always ships the right
 *                     classes on the first byte - no flash)
 *
 * The store also manages the .dark class and data-theme attribute on
 * document.documentElement so Tailwind's class-based dark mode and the
 * per-theme CSS variable selectors take effect immediately.
 *
 * Usage:
 *   import { themeStore } from '$lib/theme-store';
 *
 *   // Read current values (Svelte auto-subscribes with $themeStore)
 *   $themeStore.mode    // "light" | "dark" | "system"
 *   $themeStore.accent  // "default" | "dracula" | ...
 *
 *   // Change values
 *   themeStore.setMode("dark")
 *   themeStore.setAccent("catppuccin")
 */

import { writable, derived, get } from "svelte/store";
import { THEME_IDS, parseMode, parseAccent, type ThemeMode, type ThemeId } from "./theme";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function writeCookie(name: string, value: string): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // SSR or cookie-restricted environment - no-op
  }
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(
      new RegExp("(?:^|;\\s*)" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or private browsing - ignore
  }
}

// ─── System preference helper ─────────────────────────────────────────────────

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/** Resolve the actual polarity from a stored mode + live system preference. */
function resolvePolarity(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return systemPrefersDark() ? "dark" : "light";
}

// ─── DOM application ──────────────────────────────────────────────────────────

/**
 * Push the current mode + accent to document.documentElement.
 * Safe to call in SSR contexts (the try/catch is cheap).
 */
function applyToDom(mode: ThemeMode, accent: ThemeId): void {
  try {
    const root = document.documentElement;
    const isDark = resolvePolarity(mode) === "dark";

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", accent);

    // Keep color-scheme in sync for native browser UI (scrollbars etc.)
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch {
    // SSR - nothing to do
  }
}

// ─── Store state ──────────────────────────────────────────────────────────────

export interface ThemeState {
  mode: ThemeMode;
  accent: ThemeId;
  /** The resolved polarity - "light" or "dark" - accounting for "system". */
  resolvedPolarity: "light" | "dark";
}

// Raw writable stores - internal, not exported directly
const _mode = writable<ThemeMode>("system");
const _accent = writable<ThemeId>("default");

// ─── Initialisation ───────────────────────────────────────────────────────────

let _mqlHandler: (() => void) | null = null;
let _mql: MediaQueryList | null = null;
let _initialised = false;

/**
 * Initialise the store from persisted values.
 * Must be called inside `onMount` (client-only).
 * Idempotent - safe to call multiple times.
 */
export function initThemeStore(): void {
  if (_initialised) return;
  _initialised = true;

  // ── Read persisted preferences ─────────────────────────────────────────────
  // Priority: localStorage > cookie (legacy "theme" cookie also accepted for
  // backwards compat from the old single-cookie implementation).

  const storedMode = parseMode(
    lsGet("theme-mode") ??
      readCookie("theme-mode") ??
      // Legacy single cookie written by the old Navbar.svelte
      (readCookie("theme") === "dark"
        ? "dark"
        : readCookie("theme") === "light"
          ? "light"
          : null)
  );

  const storedAccent = parseAccent(
    lsGet("theme-accent") ?? readCookie("theme-accent")
  );

  _mode.set(storedMode);
  _accent.set(storedAccent);

  // ── Apply immediately ──────────────────────────────────────────────────────
  applyToDom(storedMode, storedAccent);

  // ── Watch system preference changes ───────────────────────────────────────
  try {
    _mql = window.matchMedia("(prefers-color-scheme: dark)");
    _mqlHandler = () => {
      const currentMode = get(_mode);
      if (currentMode === "system") {
        applyToDom("system", get(_accent));
        // Notify subscribers that resolvedPolarity may have changed
        _mode.update((m) => m); // triggers derived re-computation
      }
    };
    if (_mql.addEventListener) {
      _mql.addEventListener("change", _mqlHandler);
    } else {
      // Safari < 14 fallback
      (_mql as any).addListener(_mqlHandler);
    }
  } catch {
    // No matchMedia support - ignore
  }
}

/** Clean up media-query listener. Call in onDestroy if needed. */
export function destroyThemeStore(): void {
  if (_mql && _mqlHandler) {
    try {
      if (_mql.removeEventListener) {
        _mql.removeEventListener("change", _mqlHandler);
      } else {
        (_mql as any).removeListener(_mqlHandler);
      }
    } catch {
      // ignore
    }
  }
  _initialised = false;
}

// ─── Persist helpers ──────────────────────────────────────────────────────────

function persistMode(mode: ThemeMode): void {
  lsSet("theme-mode", mode);
  writeCookie("theme-mode", mode);

  // Also update the system-dark hint cookie so SSR is accurate on the next
  // request when mode is "system".
  if (mode === "system") {
    const hint = systemPrefersDark() ? "1" : "0";
    writeCookie("theme-system-dark", hint);
  }
}

function persistAccent(accent: ThemeId): void {
  lsSet("theme-accent", accent);
  writeCookie("theme-accent", accent);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Derived read-only store that combines both dimensions. */
export const themeStore = derived<
  [typeof _mode, typeof _accent],
  ThemeState
>([_mode, _accent], ([$mode, $accent]) => ({
  mode: $mode,
  accent: $accent,
  resolvedPolarity: resolvePolarity($mode),
}));

export const themeActions = {
  /**
   * Set the light/dark/system mode preference.
   * Persists to localStorage + cookie and updates the DOM immediately.
   */
  setMode(mode: ThemeMode): void {
    const validated = parseMode(mode);
    _mode.set(validated);
    persistMode(validated);
    applyToDom(validated, get(_accent));
  },

  /**
   * Set the accent theme.
   * Persists to localStorage + cookie and updates the DOM immediately.
   */
  setAccent(accent: ThemeId): void {
    const validated = parseAccent(accent);
    _accent.set(validated);
    persistAccent(validated);
    applyToDom(get(_mode), validated);
  },

  /**
   * Set both dimensions at once - useful when importing from an external
   * theme preset or resetting to defaults.
   */
  set(mode: ThemeMode, accent: ThemeId): void {
    const vm = parseMode(mode);
    const va = parseAccent(accent);
    _mode.set(vm);
    _accent.set(va);
    persistMode(vm);
    persistAccent(va);
    applyToDom(vm, va);
  },

  /** Toggle between light and dark (never system). */
  togglePolarity(): void {
    const current = get(_mode);
    const resolved = resolvePolarity(current);
    const next: ThemeMode = resolved === "dark" ? "light" : "dark";
    this.setMode(next);
  },

  /** Reset both dimensions to the application defaults. */
  reset(): void {
    this.set("system", "default");
  },
};
