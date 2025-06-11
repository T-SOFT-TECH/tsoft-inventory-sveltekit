<script>
  /** @type {import('./$types').PageData} */
  export let data; // Inherits data from src/routes/app/+layout.server.js

  // $: user = data.user; // Svelte 4 style for reactivity if needed
</script>

{#if data.user}
  <h1>Welcome to your dashboard, {data.user.email}!</h1>
  <p>This is your protected dashboard area.</p>
  <p>Your user ID is: {data.user.id}</p>
  <p>You can add more dashboard-specific content here.</p>
{:else}
  <!-- This should ideally not be reached if +layout.server.js is working correctly -->
  <p>Loading user data or please log in...</p>
{/if}

<style>
  h1 {
    color: #333;
  }
  p {
    font-size: 1.1em;
  }
</style>
