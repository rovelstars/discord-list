<script lang="ts">
  /**
   * Button.svelte
   *
   * A small Svelte port of the shadcn-style Button component that uses the
   * `buttonVariants` helper (a tiny class builder) to produce consistent
   * Tailwind-class strings.
   *
   * Props:
   *  - variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
   *  - size: 'default' | 'sm' | 'lg' | 'icon'
   *  - as: which element to render (default: 'button'). You can pass 'a' for links.
   *  - href: optional, used when rendering an anchor
   *  - type: button type when rendering a button (default: 'button')
   *  - className: additional classes (optional)
   *
   * Behavior:
   *  - Forwards any extra attributes/events to the rendered element.
   *  - Computes final class string via `buttonVariants`.
   */

  import { buttonVariants } from './button.js';

  export let variant: string = 'default';
  export let size: string = 'default';
  export let as: string = 'button';
  export let href: string | undefined = undefined;
  export let type: string = 'button';
  export let className: string = '';

  // $$restProps contains additional attributes passed to the component (including class if provided).
  // We'll merge any provided class from rest props with className so the caller can pass class normally.
  // Note: Svelte gives precedence to explicit `class=` attribute on the element; we set class explicitly below.
  // Accessing $$restProps here is allowed in Svelte components.
  // Build the final class string whenever inputs change.
  $: {
    const restClass = ($$restProps && $$restProps.class) ? String($$restProps.class) : '';
    // Merge restClass and className - buttonVariants will also append variant/size classes
    mergedClass = buttonVariants({ variant, size, className: `${restClass} ${className}`.trim() });
  }

  let mergedClass: string;
</script>

<svelte:element
  this={as}
  {...$$restProps}
  class={mergedClass}
  {...(as === 'button' ? { type } : {})}
  {...(as === 'a' && href ? { href } : {})}
>
  <slot />
</svelte:element>

<style>
  /* Keep this file visual-free; styling is provided by Tailwind tokens via global.css.
     A minimal transition is helpful for interactive buttons. */
  :global(.inline-flex) {
    transition: transform 0.08s ease, opacity 0.08s ease;
  }
</style>
