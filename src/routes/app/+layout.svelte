<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores'; // For navigation, e.g. active links

  let { data, children }: { data: LayoutData, children: Snippet } = $props();

  let user = $derived(data.user);
  let isAdmin = $derived(data.isAdmin);
  let profile = $derived(user?.profile); // Access the profile from the user object

  // $: console.log('App layout data user:', user);
  // $: console.log('App layout data profile:', profile);
</script>

<div class="app-layout-container">
  <aside class="app-sidebar">
    <nav>
      <h2 class="sidebar-title">Navigation</h2>
      <ul>
        <li><a href="/app/dashboard" class:active={$page.url.pathname === '/app/dashboard'}>Dashboard</a></li>
        <li><a href="/app/customers" class:active={$page.url.pathname.startsWith('/app/customers')}>Manage Customers</a></li>
        <li><a href="/app/pos" class:active={$page.url.pathname.startsWith('/app/pos')}>New Sale / POS</a></li>
        <li><a href="/app/invoices" class:active={$page.url.pathname.startsWith('/app/invoices')}>Invoices</a></li>
        <!-- Add other app-specific navigation links here -->
        {#if isAdmin}
          <li><hr class="nav-hr"><span class="nav-section-header">Admin</span></li>
          <li><a href="/app/admin/categories" class:active={$page.url.pathname.startsWith('/app/admin/categories')}>Categories</a></li>
          <li><a href="/app/admin/brands" class:active={$page.url.pathname.startsWith('/app/admin/brands')}>Brands</a></li>
          <li><a href="/app/admin/products" class:active={$page.url.pathname.startsWith('/app/admin/products')}>Products</a></li>
          <!-- Add other admin section links here -->
        {/if}
      </ul>
    </nav>
  </aside>

  <div class="app-main-content-area">
    <header class="app-header-bar flex justify-between items-center"> {/* Added flex for alignment */}
      <div> {/* Grouping for welcome message and user details */}
        {#if user}
          <div class="flex items-center">
            {#if profile?.avatar_url}
              <img src={profile.avatar_url} alt="{profile.username ?? user.email}'s avatar" class="w-10 h-10 rounded-full object-cover mr-3 border" />
            {:else}
              <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg mr-3 border">
                {(profile?.username || profile?.full_name || user.email || 'U').substring(0, 1).toUpperCase()}
              </div>
            {/if}
            <div>
              <p class="text-sm font-medium text-gray-700">
                Welcome, {profile?.full_name || profile?.username || user.email}!
              </p>
              <p class="text-xs text-gray-500">Logged into App Area</p>
            </div>
          </div>
        {:else}
           <p>Welcome to the App Area</p>
        {/if}
      </div>
      <div>
         <!-- Other header content like global actions or search could go here -->
      </div>
    </header>
    <hr class="header-divider"/>
    <div class="page-content-wrapper">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .app-layout-container {
    display: flex;
    min-height: calc(100vh - var(--header-height, 60px)); /* Adjust if you have a fixed global header height */
  }

  .app-sidebar {
    width: 240px;
    background-color: #f4f4f8;
    padding: 1rem;
    border-right: 1px solid #e0e0e0;
  }

  .sidebar-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .app-sidebar nav ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .app-sidebar nav ul li a {
    display: block;
    padding: 0.5rem 0.75rem;
    text-decoration: none;
    color: #333;
    border-radius: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .app-sidebar nav ul li a:hover {
    background-color: #e9e9f2;
  }

  .app-sidebar nav ul li a.active {
    background-color: #007bff; /* Example active link color */
    color: white;
    font-weight: 500;
  }

  .nav-hr {
    margin: 0.75rem 0;
    border: none;
    border-top: 1px solid #ccc;
  }

  .nav-section-header {
    display: block;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    color: #555;
    font-weight: 600;
  }

  .app-main-content-area {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .app-header-bar {
    padding: 0.75rem 1.5rem; /* Adjusted padding */
    background-color: #ffffff;
    /* box-shadow: 0 1px 3px rgba(0,0,0,0.1); */ /* Softer shadow if needed */
  }
  .app-header-bar img.border { /* Add a subtle border to avatar */
    border-color: #e2e8f0; /* Tailwind gray-300 */
  }

  .header-divider {
     border: none;
     border-top: 1px solid #e0e0e0;
     margin: 0;
  }

  .page-content-wrapper {
    padding: 1.5rem;
    flex-grow: 1;
    background-color: #fff; /* Or a light gray for content background */
  }
</style>
