<script lang="ts">
  import BotCard from '$lib/components/BotCard.svelte';
  import AddBot from '$lib/components/AddBot.svelte';

  /**
   * Props:
   * - list: array of bot objects
   * - permissions: string (e.g. "edit") used to decide whether to show edit actions
   * - show_new: whether to render the AddBot card
   * - edit: explicit override to force edit mode
   */
  export let list: any[] = [];
  export let permissions: string = '';
  export let show_new: boolean = false;
  export let edit: boolean = false;
</script>

<div class="flex flex-wrap justify-center gap-4 mx-4">
  {#each list as bot (bot?.id)}
    <BotCard {bot} edit={edit || permissions === 'edit'} />
  {/each}

  {#if show_new}
    <AddBot />
  {/if}
</div>

<style>
  /* Keep layout consistent with the old implementation */
  .flex {
    /* Tailwind utilities are the primary source of styling;
       these minimal rules are fallbacks so the layout remains usable
       even before Tailwind is applied. */
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-left: 1rem;
    margin-right: 1rem;
  }
</style>
