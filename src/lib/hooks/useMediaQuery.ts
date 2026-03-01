/**
 * useMediaQuery.ts
 *
 * A small Svelte-friendly utility that returns a `Readable<boolean>` store
 * which reflects whether the given media query currently matches.
 *
 * Usage:
 *  import { useMediaQuery } from '$lib/hooks/useMediaQuery';
 *  const isDesktop = useMediaQuery('(min-width: 768px)');
 *
 *  $: if ($isDesktop) { ... }
 *
 * The returned store cleans up its event listeners automatically when there
 * are no more subscribers.
 */

import { readable, type Readable } from 'svelte/store';

export function useMediaQuery(query: string, initial = false): Readable<boolean> {
  // If we're running on the server, immediately return a readable with the initial value.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return readable<boolean>(initial, () => {
      // no-op teardown
      return () => {};
    });
  }

  // On the client, create a readable store that subscribes to matchMedia.
  return readable<boolean>(false, (set) => {
    const mql = window.matchMedia(query);

    // Set initial value from the media query result.
    set(mql.matches);

    // Handler compatible with both addEventListener('change', ...) and addListener(...)
    const handler = (ev: MediaQueryListEvent | MediaQueryList) => {
      // ev may be a MediaQueryListEvent (with .matches) or a MediaQueryList (older API)
      // Normalize by reading `.matches` where available.
      const matches = (ev as MediaQueryListEvent).matches ?? (ev as MediaQueryList).matches;
      set(Boolean(matches));
    };

    // Prefer modern API but fall back to legacy addListener/removeListener
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler as EventListener);
    } else if (typeof (mql as any).addListener === 'function') {
      (mql as any).addListener(handler);
    }

    // Teardown - remove listeners when the last subscriber unsubscribes.
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handler as EventListener);
      } else if (typeof (mql as any).removeListener === 'function') {
        (mql as any).removeListener(handler);
      }
    };
  });
}

export default useMediaQuery;
