/**
 * Simple port of shadcn `buttonVariants` using plain JS.
 *
 * Usage:
 * import { buttonVariants } from './ui/button.js';
 * const classes = buttonVariants({ variant: 'default', size: 'sm', className: 'my-extra' });
 */

/**
 * Join class parts into a single class string.
 * @param {...(string|false|undefined)} parts
 * @returns {string}
 */
export function cn(...parts) {
	return parts.filter(Boolean).join(' ');
}

const base =
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

/** @type {Record<string,string>} */
const variants = {
	default: 'bg-primary text-primary-foreground hover:bg-primary/90',
	destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
	outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
	secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
	ghost: 'hover:bg-accent hover:text-accent-foreground',
	link: 'text-primary underline-offset-4 hover:underline'
};

/** @type {Record<string,string>} */
const sizes = {
	default: 'h-10 px-4 py-2',
	sm: 'h-9 rounded-md px-3',
	lg: 'h-11 rounded-md px-8',
	icon: 'h-10 w-10'
};

/**
 * Build button class string.
 * @typedef {{variant?:string,size?:string,className?:string}} ButtonOpts
 *
 * @param {ButtonOpts} [opts]
 * @returns {string} concatenated class string
 */
export function buttonVariants({ variant = 'default', size = 'default', className = '' } = {}) {
	// Use typed lookup via Record<string,string> to avoid implicit any indexing issues
	const v = variants[variant] || variants['default'];
	const s = sizes[size] || sizes['default'];
	return cn(base, v, s, className);
}
