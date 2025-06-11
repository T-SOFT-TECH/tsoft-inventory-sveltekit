<script lang="ts">
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores'; // For active link highlighting or breadcrumbs

  let { data, children }: { data: LayoutData, children: Snippet } = $props();

  // User is guaranteed to be an admin user here due to +layout.server.ts guard
  // let adminUser = $derived(data.user);
</script>

<div class="admin-layout p-4"> {/* Basic padding, assuming Tailwind utilities */}
  <header class="admin-header mb-4 pb-2 border-b"> {/* Basic structure, Tailwind for styling */}
    <h1 class="text-xl font-semibold">Admin Panel</h1>
    {#if data.user}
      <p class="text-sm text-gray-600">Logged in as Admin: <span class="font-medium">{data.user.email}</span></p>
    {/if}
  </header>

  <nav class="admin-main-nav mb-6">
    <ul class="flex space-x-4">
      <li><a href="/app/admin/categories" class:active={$page.url.pathname.startsWith('/app/admin/categories')} class="text-blue-600 hover:underline">Manage Categories</a></li>
      <li><a href="/app/admin/brands" class:active={$page.url.pathname.startsWith('/app/admin/brands')} class="text-blue-600 hover:underline">Manage Brands</a></li>
      <li><a href="/app/admin/products" class:active={$page.url.pathname.startsWith('/app/admin/products')} class="text-blue-600 hover:underline">Manage Products</a></li>
      <!-- More admin links can be added here -->
      <li><a href="/app/dashboard" class="text-gray-700 hover:underline">User Dashboard</a></li>
    </ul>
  </nav>

  <main class="admin-content-area">
    {@render children()}
  </main>

  <footer class="admin-footer mt-8 pt-4 border-t text-center text-sm text-gray-500">
    <p>Admin Section Footer</p>
  </footer>
</div>

<!--
  No <style> tag here as per instruction, assuming Tailwind or global CSS handles styling.
  The classes like "p-4", "mb-4", "text-xl" are examples of what would be Tailwind classes.
  If specific non-utility styles were needed for .admin-layout, .admin-header etc.,
  they would go into a <style> tag or a global CSS file.
-->

<!-- Example active class style (would typically be in a global CSS or handled by Tailwind's group features) -->
<style>
  nav a.active {
    font-weight: bold;
    /* text-decoration: underline; */ /* Or other active indication */
    color: #1D4ED8; /* Darker blue for active example */
  }
  /* Basic Tailwind-like placeholder classes for structure if not using full Tailwind in this snippet */
  .p-4 { padding: 1rem; }
  .mb-4 { margin-bottom: 1rem; }
  .pb-2 { padding-bottom: 0.5rem; }
  .border-b { border-bottom-width: 1px; border-color: #e5e7eb; } /* Example border */
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .font-semibold { font-weight: 600; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-gray-600 { color: #4b5563; }
  .font-medium { font-weight: 500; }
  .mb-6 { margin-bottom: 1.5rem; }
  .flex { display: flex; }
  .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .text-blue-600 { color: #2563eb; }
  .hover\:underline:hover { text-decoration: underline; }
  .text-gray-700 { color: #374151; }
  .mt-8 { margin-top: 2rem; }
  .pt-4 { padding-top: 1rem; }
  .border-t { border-top-width: 1px; }
  .text-center { text-align: center; }
  .text-gray-500 { color: #6b7280; }

</style>
