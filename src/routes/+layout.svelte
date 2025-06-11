<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';

  /** @type {import('./$types').LayoutData} */
  export let data; // This will receive data from +layout.server.js

  // Reactive declaration for user based on data prop
  $: user = data.user;
  // $: session = data.session; // If you need to react to session changes directly
</script>

<nav>
  <ul>
    {#if user}
      <li><span>Welcome, {user.email}</span></li>
      <li>
        <form method="POST" action="/auth/login?/logout" use:enhance>
          <button type="submit">Logout</button>
        </form>
      </li>
    {:else}
      <li><a href="/auth/login">Login</a></li>
      <li><a href="/auth/register">Register</a></li>
    {/if}
    {#if $page.url.pathname !== '/'}
      <li><a href="/">Home</a></li>
    {/if}
    {#if user && $page.url.pathname !== '/app/dashboard'}
       <li><a href="/app/dashboard">Dashboard</a></li>
    {/if}
  </ul>
</nav>

<hr />

<main>
  <slot />
</main>

<style>
  nav ul {
    list-style-type: none;
    padding: 0;
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  nav a, nav button {
    text-decoration: none;
    color: inherit;
  }
  nav button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }
</style>
