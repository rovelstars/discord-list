<script lang="ts">
  /**
   * Label.svelte
   *
   * A small, accessible label component ported from the old project.
   * It mirrors the original Tailwind class names so the visual style remains consistent.
   *
   * Props:
   *  - for: id of the associated control (htmlFor)
   *  - class: additional classes to merge onto the label
   *  - error: if true, apply `text-destructive` to indicate an error state
   *
   * Usage:
   *  <Label for="email">Email</Label>
   *
   * Notes:
   *  - Additional attributes are forwarded to the <label> element via $$restProps.
   *  - The default classes match the original project's `labelVariants`.
   */

  export let forId: string | undefined = undefined;
  // `class` is allowed as a prop name in Svelte - it will also merge with any class passed via attributes
  export let classId: string = '';
  export let errorId: boolean = false;

  // base label classes (from original project)
  const base = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  $: computed = `${base} ${errorId ? 'text-destructive' : ''} ${classId}`.trim();
</script>

<label for={forId} class={computed} {...$$restProps}>
	<slot />
</label>

<style>
	/* Keep styling minimal; the project theme tokens (in global.css) and Tailwind utilities
     are expected to drive most of the visual appearance. This file only ensures a small
     spacing/line-height fallback where necessary. */
	label {
		line-height: 1;
	}
</style>
