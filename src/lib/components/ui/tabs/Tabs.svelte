<script lang="ts">
  /**
   * Tabs.svelte
   *
   * Provides a lightweight Tabs implementation with the following slot-based API:
   *
   * <Tabs defaultValue="edit">
   *   <div slot="list">
   *     <button data-value="edit">Edit</button>
   *     <button data-value="preview">Preview</button>
   *   </div>
   *
   *   <div slot="content">
   *     <div data-value="edit"> ... edit content ... </div>
   *     <div data-value="preview"> ... preview content ... </div>
   *   </div>
   * </Tabs>
   *
   * Behavior:
   * - Clicking a trigger (element with `data-value`) activates a panel with matching `data-value`.
   * - Keyboard navigation (Left/Right/Up/Down/Home/End) is supported when focusing a trigger.
   * - If `defaultValue` is omitted, first panel's value is chosen as active on mount.
   *
   * This single-file component offers a simple, accessible tab widget without creating
   * many small Svelte files. It intentionally uses data attributes (`data-value`) so the
   * markup is straightforward to port from other frameworks.
   */

  import { onMount } from 'svelte';

  export let defaultValue: string | null = null;
  export let className: string = '';

  // DOM refs
  let listContainer: HTMLElement | null = null;
  let listSlot: HTMLSlotElement | null = null;
  let contentSlot: HTMLSlotElement | null = null;

  // internal state
  let activeValue: string | null = defaultValue;
  let triggers: HTMLElement[] = [];
  let panels: HTMLElement[] = [];

  // helper to read slotted nodes and populate triggers/panels
  function refreshSlots() {
    // collect triggers from list slot assigned elements (descend into assigned elements to find data-value)
    triggers = [];
    panels = [];

    if (listSlot) {
      const assigned = listSlot.assignedElements({ flatten: true }) as HTMLElement[];
      // find elements with data-value within assigned elements
      for (const el of assigned) {
        // if the assigned element itself has data-value -> treat as trigger, otherwise search children
        if (el.dataset && el.dataset.value) {
          triggers.push(el);
        } else {
          // find descendants that are triggers
          triggers.push(...Array.from(el.querySelectorAll<HTMLElement>('[data-value]')));
        }
      }
    }

    if (contentSlot) {
      const assigned = contentSlot.assignedElements({ flatten: true }) as HTMLElement[];
      for (const el of assigned) {
        if (el.dataset && el.dataset.value) {
          panels.push(el);
        } else {
          panels.push(...Array.from(el.querySelectorAll<HTMLElement>('[data-value]')));
        }
      }
    }

    // remove duplicates just in case
    triggers = Array.from(new Set(triggers));
    panels = Array.from(new Set(panels));

    // ensure each panel has an id and each trigger has aria-controls
    panels.forEach((panel, i) => {
      if (!panel.id) panel.id = `svelte-tabpanel-${i}-${Math.random().toString(36).slice(2, 7)}`;
    });

    // initialize active value if not set
    if (!activeValue) {
      if (defaultValue) {
        activeValue = defaultValue;
      } else if (panels.length > 0) {
        activeValue = panels[0].dataset.value ?? null;
      }
    }

    applyState();
  }

  function applyState() {
    // update triggers ARIA + tabindex
    triggers.forEach((t, idx) => {
      t.setAttribute('role', 'tab');
      const val = t.dataset.value ?? '';
      const selected = val === activeValue;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
      // link to panel via aria-controls if possible
      const panel = panels.find(p => p.dataset.value === val);
      if (panel) {
        t.setAttribute('aria-controls', panel.id);
      } else {
        t.removeAttribute('aria-controls');
      }
    });

    // update panels: show/hide
    panels.forEach(p => {
      const val = p.dataset.value ?? '';
      const active = val === activeValue;
      if (active) {
        p.removeAttribute('hidden');
        p.setAttribute('aria-hidden', 'false');
        p.tabIndex = 0;
      } else {
        p.setAttribute('hidden', '');
        p.setAttribute('aria-hidden', 'true');
        p.tabIndex = -1;
      }
      p.setAttribute('role', 'tabpanel');
    });
  }

  function selectValue(value: string | null) {
    if (value == null) return;
    if (value === activeValue) return;
    const exists = panels.some(p => p.dataset.value === value);
    if (!exists) return;
    activeValue = value;
    applyState();
    // move focus to the selected trigger for better keyboard UX
    const trigger = triggers.find(t => t.dataset.value === value);
    if (trigger) trigger.focus();
    // dispatch a custom event to let parents know (DOM event)
    const ev = new CustomEvent('change', { detail: { value } });
    // bubble from list container if possible
    (listContainer ?? document).dispatchEvent(ev);
  }

  // handle click delegation on list container
  function onListClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const el = target.closest('[data-value]') as HTMLElement | null;
    if (!el) return;
    const val = el.dataset.value ?? null;
    if (val) selectValue(val);
  }

  // keyboard support for list (Left/Right/Home/End/Up/Down)
  function onListKeyDown(e: KeyboardEvent) {
    const key = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '].includes(key)) return;
    // find the currently focused trigger or the active trigger
    const activeIndex = triggers.findIndex(t => t.dataset.value === activeValue);
    const focused = document.activeElement as HTMLElement | null;
    let idx = triggers.indexOf(focused ?? (triggers[activeIndex] ?? null));
    if (idx === -1) idx = activeIndex >= 0 ? activeIndex : 0;

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx - 1 + triggers.length) % triggers.length;
      const val = triggers[next]?.dataset.value;
      if (val) selectValue(val);
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % triggers.length;
      const val = triggers[next]?.dataset.value;
      if (val) selectValue(val);
    } else if (key === 'Home') {
      e.preventDefault();
      const val = triggers[0]?.dataset.value;
      if (val) selectValue(val);
    } else if (key === 'End') {
      e.preventDefault();
      const val = triggers[triggers.length - 1]?.dataset.value;
      if (val) selectValue(val);
    } else if (key === 'Enter' || key === ' ') {
      // activate the focused trigger (space/enter)
      e.preventDefault();
      const el = focused && focused.dataset && focused.dataset.value ? focused : triggers[idx];
      if (el) {
        const val = el.dataset.value;
        if (val) selectValue(val);
      }
    }
  }

  // On mount, set up initial state and watch for slot changes
  onMount(() => {
    // initial refresh
    refreshSlots();

    // attach slotchange listeners to keep things in sync when slotted content changes
    if (listSlot) listSlot.addEventListener('slotchange', refreshSlots);
    if (contentSlot) contentSlot.addEventListener('slotchange', refreshSlots);

    return () => {
      if (listSlot) listSlot.removeEventListener('slotchange', refreshSlots);
      if (contentSlot) contentSlot.removeEventListener('slotchange', refreshSlots);
    };
  });
</script>

<!--
  Structure:
  - A container for the tablist (role=tablist). The user provides triggers inside the 'list' slot.
  - A content area which contains panels inside the 'content' slot. Panels must have data-value attributes.
-->
<div class={className}>
  <!-- Tab list wrapper: we intercept clicks and keyboard events on this wrapper -->
  <div
    class="tabs-list"
    role="tablist"
    bind:this={listContainer}
    on:click={onListClick}
    on:keydown={onListKeyDown}
  >
    <!-- The slot where users place triggers (elements with data-value) -->
    <slot name="list" bind:this={listSlot}></slot>
  </div>

  <!-- Content slot where panels live; panels must have data-value attributes -->
  <div class="tabs-content">
    <slot name="content" bind:this={contentSlot}></slot>
  </div>
</div>

<style>
  /* Minimal default styles; the project uses Tailwind for most visuals.
     These are present to ensure basic accessibility and layout if Tailwind isn't available yet. */
  :global(.tabs-list) {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  :global(.tabs-content) {
    margin-top: 1rem;
  }
  /* Hidden panels are controlled via the HTML `hidden` attribute; browsers hide them automatically */
</style>
