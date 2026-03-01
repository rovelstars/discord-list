<script lang="ts">
  import { onMount } from "svelte";

  export let text: string = "";
  export let className: string = "";

  let isBlurred = true;
  let isCopied = false;
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  // Toggle blur on/off
  function toggleBlur() {
    isBlurred = !isBlurred;
  }

  // Robust copy: try navigator.clipboard, fall back to textarea
  async function copyToClipboard(value: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = value;
        // Move element out of screen to make it invisible
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    if (ok) {
      isCopied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        isCopied = false;
        copyTimeout = null;
      }, 2000);
    } else {
      // best-effort fallback UI: brief flash or console message
      // keep it silent so we don't spam the user
      console.warn("Copy failed");
    }
  }

  // Cleanup
  onMount(() => {
    return () => {
      if (copyTimeout) clearTimeout(copyTimeout);
    };
  });
</script>

<div class={`flex items-center space-x-2 ${className}`}>
  <div class="relative grow">
    <p
      class={`font-mono p-2 rounded transition-all duration-200 bg-background text-foreground ${
        isBlurred ? "blur-sm select-none" : "select-text"
      }`}
      aria-hidden={isBlurred}
      title={isBlurred ? "Hidden — click eye to reveal" : ""}
    >
      {isBlurred ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : text}
    </p>

    <!-- Toggle blur button (visually inside the text block) -->
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
      on:click={toggleBlur}
      aria-pressed={!isBlurred}
      aria-label={isBlurred ? "Show text" : "Hide text"}
      title={isBlurred ? "Show text" : "Hide text"}
    >
      {#if isBlurred}
        <!-- Eye icon -->
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      {:else}
        <!-- Eye Off icon -->
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6 0-10-7-10-7a19.25 19.25 0 0 1 5.11-5.11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1 1l22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Copy button -->
  <button
    type="button"
    class="inline-flex items-center justify-center rounded p-2 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring"
    on:click={handleCopy}
    aria-label="Copy to clipboard"
    title="Copy to clipboard"
  >
    {#if isCopied}
      <!-- Check icon -->
      <svg class="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    {:else}
      <!-- Copy icon -->
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    {/if}
  </button>

  <!-- Inline feedback -->
  {#if isCopied}
    <span class="text-sm text-green-600">Copied!</span>
  {/if}
</div>

<style>
  /* Lightweight defaults so component looks reasonable even before Tailwind runs.
     The project uses CSS variables defined in global.css for colors. */
  :global(.bg-background) {
    background-color: hsl(var(--background));
  }
  :global(.text-foreground) {
    color: hsl(var(--foreground));
  }
  :global(.bg-accent) {
    background-color: hsl(var(--accent));
  }
  :global(.text-muted-foreground) {
    color: hsl(var(--muted-foreground));
  }
</style>
