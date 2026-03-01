<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { useMediaQuery } from '$lib/hooks/useMediaQuery';

  export let href: string = '#';
  export let className: string = '';
  export let rel: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;

  // capture any other attributes passed to the component
  export let $$restProps: Record<string, any>;

  // Determine if link should open in our confirmation popup:
  // Ported logic: treat external when href starts with "http" and hostname != "discord.rovelstars.com"
  const LEGACY_INTERNAL_HOST = 'discord.rovelstars.com';
  let isExternal = false;
  let hostname: string | null = null;

  try {
    if (href && href.startsWith('http')) {
      const u = new URL(href);
      hostname = u.hostname;
      isExternal = hostname !== LEGACY_INTERNAL_HOST;
    }
  } catch (e) {
    // malformed URL -> treat as non-external
    isExternal = false;
    hostname = null;
  }

  // Small set of discord-related hosts used for messaging
  const discordHosts = new Set(['discord.com', 'discordapp.com', 'discord.gg']);

  // control popup/drawer open state
  let open = false;

  // responsive detection - desktop if min-width: 768px
  const isDesktop = useMediaQuery('(min-width: 768px)');
  // $isDesktop will be available in template

  // Called when the anchor is clicked for external links
  function handleClick(e: MouseEvent) {
    // If not external, allow default navigation
    if (!isExternal) return;

    e.preventDefault();
    open = true;
  }

  function close() {
    open = false;
  }

  function onOpenClick() {
    // Open the external link according to the original behavior:
    // For known discord hosts, open a popup sized 600x600.
    // For other external hosts, open normally (no special features -> new tab/window).
    try {
      if (!href) return;
      const u = new URL(href);
      const host = u.hostname;
      if (discordHosts.has(host)) {
        window.open(href, 'popup', 'width=600,height=600');
      } else {
        // open in a new tab/window (no special features)
        window.open(href, '_blank');
      }
    } catch (err) {
      // fallback: navigate directly
      window.location.href = href;
    } finally {
      close();
    }
  }
</script>

{#if !isExternal}
  <!-- Internal or non-http links: render direct anchor -->
  <a href={href} class={className} id={id} aria-label={ariaLabel} {...$$restProps}>
    <slot />
  </a>
{:else}
  <!-- External link: render anchor that triggers popup -->
  <a href={href} class={className} id={id} aria-label={ariaLabel} on:click|preventDefault={handleClick} {...$$restProps}>
    <slot />
  </a>

  {#if $isDesktop}
    <!-- Desktop: use modal dialog -->
    <Dialog bind:open={open} ariaLabel="External link confirmation">
      <!-- Trigger slot isn't used because we manually control `open` -->
      <div slot="content" class="max-w-sm mx-auto">
        <div class="mb-2">
          <h2 class="text-2xl font-bold">
            {#if discordHosts.has(hostname || '')}
              Opening in Discord
            {:else}
              External Website
            {/if}
          </h2>
        </div>
        <div class="text-sm text-muted-foreground mb-4">
          {#if discordHosts.has(hostname || '')}
            We will open this Discord link in a small popup.
          {:else}
            You are about to leave this site and visit an external link
            {#if hostname}
              (<span class="text-primary underline">{hostname}</span>)
            {/if}
            . Do you want to continue? This link might be unsafe.
          {/if}
        </div>

        <div class="flex gap-2 justify-end">
          <button class="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground px-4 py-2" on:click={onOpenClick}>
            Open
          </button>
          <button class="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background px-4 py-2" on:click={close}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  {:else}
    <!-- Mobile: bottom-sheet drawer style -->
    {#if open}
      <div class="fixed inset-0 z-50 flex items-end">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/60" on:click={close} />
        <!-- sheet -->
        <div class="relative w-full bg-popover border-t rounded-t-lg p-4 z-50 animate-slide-up" role="dialog" aria-modal="true" aria-label="External link popup">
          <div class="mb-2">
            <h2 class="text-lg font-semibold">
              {#if discordHosts.has(hostname || '')}
                Opening in Discord
              {:else}
                External Website
              {/if}
            </h2>
          </div>
          <div class="text-sm text-muted-foreground mb-4">
            {#if discordHosts.has(hostname || '')}
              We will open this Discord link in a small popup.
            {:else}
              You are about to leave this site and visit an external link
              {#if hostname}
                (<span class="text-primary underline">{hostname}</span>)
              {/if}
              . Do you want to continue? This link might be unsafe.
            {/if}
          </div>

          <div class="flex gap-2">
            <button class="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground px-4 py-2" on:click={onOpenClick}>
              Open
            </button>
            <button class="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background px-4 py-2" on:click={close}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>
        /* simple slide-up animation for the mobile drawer */
        @keyframes slideUp {
          from { transform: translateY(12%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 180ms ease-out forwards;
        }
      </style>
    {/if}
  {/if}
{/if}

<style>
  /* Keep styling minimal; most tokens come from global.css & Tailwind */
  a {
    text-decoration: inherit;
  }

  .text-muted-foreground {
    color: hsl(var(--muted-foreground));
  }

  .text-primary {
    color: hsl(var(--primary));
  }

  .bg-popover {
    background-color: hsl(var(--popover));
  }

  .border-input {
    border-color: hsl(var(--input));
  }

  .border {
    border-color: hsl(var(--border));
  }
</style>
