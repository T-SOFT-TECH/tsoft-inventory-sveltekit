<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // For potential messages from server redirect
  import { onMount } from 'svelte';

  /** @type {import('./$types').PageData} */
  export let data; // From +page.server.js load function

  /** @type {import('./$types').ActionData} */
  export let form; // From form actions (e.g., delete action)

  let displayMessage = '';

  // Display messages from server-side form actions or redirects
  onMount(() => {
    const urlParams = new URLSearchParams($page.url.search);
    if (urlParams.has('message')) {
      displayMessage = urlParams.get('message');
      // Clear the message from URL to prevent it from showing again on refresh if not desired
      // window.history.replaceState({}, document.title, $page.url.pathname);
    }
  });

  // Reactive statement to update message if form submission provides one
  $: if (form?.message) displayMessage = form.message;
  // Note: `form.error` from `fail(status, { error: ...})` is not standard.
  // `fail` populates `form` with the object directly, so `form.message` is typical.
  // If you use `throw error()`, it's caught by SvelteKit's error handling.

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Brands</h1>
    <a href="/app/admin/brands/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Brand
    </a>
  </div>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded" class:bg-green-200={!form?.message && displayMessage.toLowerCase().includes("success")} class:text-green-800={!form?.message && displayMessage.toLowerCase().includes("success")} class:bg-red-200={form?.message} class:text-red-800={form?.message} >
      {displayMessage}
    </div>
  {/if}

  {#if data.brands && data.brands.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">Logo</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.brands as brand (brand.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{brand.name}</td>
              <td class="px-6 py-4">
                {#if brand.logo_url}
                  <img src={brand.logo_url} alt="{brand.name} logo" style="max-height: 50px; max-width: 100px; object-fit: contain;" />
                {:else}
                  <span>No logo</span>
                {/if}
              </td>
              <td class="px-6 py-4 flex space-x-2">
                <a href={`/app/admin/brands/${brand.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>

                <form method="POST" action="?/delete&id={brand.id}" use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'error') { // From fail(500) or unexpected server error
                      alert(`Server Error: ${result.error.message}`);
                      displayMessage = `Server Error: ${result.error.message}`;
                    } else if (result.type === 'failure') { // From fail(400/401/etc.)
                      if (result.data?.message) {
                        alert(`Could not delete brand: ${result.data.message}`);
                        // displayMessage will be updated by `$: if (form?.message)`
                      }
                    } else if (result.type === 'success' && result.data?.message) {
                        // This case is less likely if server redirects on success.
                        // If server returns data instead of redirect, this would be useful.
                        displayMessage = result.data.message;
                    }
                    // SvelteKit updates `form` prop from `result.data` on `failure`.
                    // `update()` ensures client state reflects these changes if not redirecting.
                    await update({ reset: false });
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this brand? This might affect associated products.');">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-center text-gray-500 py-8">No brands found.
      <a href="/app/admin/brands/new" class="text-blue-500 hover:underline">Add one!</a>
    </p>
  {/if}
</div>

<!-- Basic Tailwind-like utility classes (actual Tailwind would be better) -->
<style>
  .container { max-width: 1280px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .p-4 { padding: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-center { align-items: center; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .bg-blue-500 { background-color: #3B82F6; }
  .hover\:bg-blue-700:hover { background-color: #1D4ED8; }
  .text-white { color: #ffffff; }
  .font-bold { font-weight: 700; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .rounded { border-radius: 0.25rem; }
  .overflow-x-auto { overflow-x: auto; }
  .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .sm\:rounded-lg { border-radius: 0.5rem; }
  .min-w-full { min-width: 100%; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-left { text-align: left; }
  .text-gray-500 { color: #6B7280; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-gray-700 { color: #374151; }
  .uppercase { text-transform: uppercase; }
  .bg-gray-50 { background-color: #F9FAFB; }
  .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .bg-white { background-color: #ffffff; }
  .border-b { border-bottom-width: 1px; border-color: #E5E7EB; }
  .hover\:bg-gray-50:hover { background-color: #F9FAFB; }
  .font-medium { font-weight: 500; }
  .text-gray-900 { color: #111827; }
  .whitespace-nowrap { white-space: nowrap; }
  .space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem; }
  .text-blue-600 { color: #2563EB; }
  .hover\:text-blue-800:hover { color: #1E40AF; }
  .text-red-600 { color: #DC2626; }
  .hover\:text-red-800:hover { color: #991B1B; }
  .text-center { text-align: center; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .hover\:underline:hover { text-decoration: underline; }
  .bg-green-200 { background-color: #A7F3D0; }
  .text-green-800 { color: #065F46; }
  .bg-red-200 { background-color: #FECACA; }
  .text-red-800 { color: #991B1B; }
</style>
