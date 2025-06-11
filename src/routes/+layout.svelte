<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Used for conditional links based on current path

  let { data, children }: { data: LayoutData, children: Snippet } = $props();

  let user = $derived(data.user);
  let profile = $derived(user?.profile); // Access profile from the user object
  // let session = $derived(data.session); // If session data is needed directly

  // For displaying messages from redirects (e.g., after logout)
  let displayMessage = $state('');

  $effect(() => {
    const urlParams = new URLSearchParams($page.url.search);
    if (urlParams.has('message')) {
      displayMessage = urlParams.get('message')!;
      // Optional: Clear message from URL after displaying
      // const newUrl = new URL($page.url);
      // newUrl.searchParams.delete('message');
      // window.history.replaceState(window.history.state, '', newUrl);
    } else {
      displayMessage = ''; // Clear if no message param
    }
  });

</script>

<div class="layout-container">
  <header class="site-header">
    <nav class="main-nav">
      <a href="/" class="logo">MyApp</a>
      <ul>
        <li><a href="/">Home</a></li>
        {#if user}
          <li><a href="/app/dashboard">Dashboard</a></li>
          <li class="flex items-center">
            {#if profile?.avatar_url}
                <img src={profile.avatar_url} alt="User avatar" class="w-8 h-8 rounded-full object-cover mr-2 border border-gray-600" />
            {:else}
                <div class="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-semibold mr-2 border border-gray-600">
                    {(profile?.username || profile?.full_name || user.email || 'U').substring(0, 1).toUpperCase()}
                </div>
            {/if}
            <span>Welcome, {profile?.full_name || profile?.username || user.email}</span>
          </li>
          <li>
            <form method="POST" action="/auth/login?/logout" use:enhance class="inline">
              <button type="submit" class="logout-button">Logout</button>
            </form>
          </li>
        {:else}
          <li><a href="/auth/login">Login</a></li>
          <li><a href="/auth/register">Register</a></li>
        {/if}
      </ul>
    </nav>
  </header>

  {#if displayMessage}
    <div class="message-banner">
      <p>{displayMessage}</p>
    </div>
  {/if}

  <main class="main-content">
    {@render children()}
  </main>

  <footer class="site-footer">
    <p>&copy; {new Date().getFullYear()} MyApp. All rights reserved.</p>
  </footer>
</div>

<!--
  Global styles and Tailwind are expected to be handled in app.css or via Tailwind setup.
  Specific layout styles that are not utility-based can remain here if necessary,
  but for this task, we assume Tailwind placeholders are removed.
  If there were specific structural styles for this layout not covered by global/Tailwind, they'd go here.
-->
<style>
  .layout-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    font-family: sans-serif; /* Basic font */
  }
  .site-header {
    background-color: #333;
    color: white;
    padding: 1rem;
  }
  .main-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }
  .main-nav .logo {
    font-weight: bold;
    font-size: 1.5rem;
    color: white;
    text-decoration: none;
  }
  .main-nav ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 1rem; /* Applied to ul, li will get spacing */
  }
  .main-nav li { /* Ensure li itself is a flex item if it contains multiple sub-items like avatar+span */
    display: flex;
    align-items: center;
  }
  .main-nav a, .main-nav span, .logout-button {
    color: white;
    text-decoration: none;
  }
  .main-nav a:hover, .logout-button:hover {
    text-decoration: underline;
  }
  .logout-button {
    background: none;
    border: none;
    padding: 0; /* Reset padding */
    margin: 0; /* Reset margin */
    font: inherit;
    cursor: pointer;
    display: inline; /* Make it behave like text for alignment */
  }
  .main-nav form.inline { /* Ensure form doesn't add extra block layout */
    display: inline;
  }
  .message-banner {
    padding: 1rem;
    background-color: #f0f8ff; /* AliceBlue for example */
    text-align: center;
    border-bottom: 1px solid #ddd;
  }
  .main-content {
    flex-grow: 1;
    padding: 1rem;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
  .site-footer {
    background-color: #333;
    color: white;
    text-align: center;
    padding: 1rem;
    margin-top: auto;
  }
</style>
