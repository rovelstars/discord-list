/**
 * Simple inline SVG icon helpers
 *
 * Each function returns an SVG string that can be inserted into Svelte templates via {@html ...}
 * or inserted into the DOM in other ways. They keep styling flexible by using `currentColor`
 * for strokes/fills and accept optional `className`, `width`, and `height` arguments.
 *
 * Example (Svelte):
 *  {@html Eye({ className: 'w-4 h-4', width: 16, height: 16 })}
 *
 * These are intentionally minimal and dependency-free replacements for lucide/react icons,
 * suitable for the small set of icons used by the ported components.
 */

export function Eye({ className = '', width = 16, height = 16 } = {}) {
	return `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeAttr(className)}" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`;
}

export function UserPlus({ className = '', width = 16, height = 16 } = {}) {
	return `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeAttr(className)}" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <!-- user head -->
    <path d="M16 11a4 4 0 1 0-8 0"></path>
    <!-- user body -->
    <path d="M2 21v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1"></path>
    <!-- plus sign -->
    <path d="M19 8v6"></path>
    <path d="M16 11h6"></path>
  </svg>`;
}

export function Vote({ className = '', width = 16, height = 16 } = {}) {
	// A simple star icon to represent "vote"
	return `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeAttr(className)}" width="${width}" height="${height}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896 4.664 23.165l1.402-8.168L0.132 9.21l8.2-1.192z"></path>
  </svg>`;
}

/* Small helper to escape attribute values to avoid accidental injection when using the helpers in templates. */
/** @param {string|number|null|undefined} str */
function escapeAttr(str) {
	if (str == null) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
