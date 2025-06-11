<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // For potential messages from server redirect
  import { onMount } from 'svelte';

  /** @type {import('./$types').PageData} */
  export let data; // From +page.server.js load function

  /** @type {import('./$types').ActionData} */
  export let form; // From form actions

  let displayMessage = '';

  // Display messages from server-side form actions or redirects
  onMount(() => {
    const urlParams = new URLSearchParams($page.url.search);
    if (urlParams.has('message')) {
      displayMessage = urlParams.get('message');
    }
  });

  // Reactive statement to update message if form submission provides one
  $: if (form?.message) displayMessage = form.message;
  $: if (form?.error) displayMessage = `Error: ${form.error}`; // For ActionData errors

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Categories</h1>
    <a href="/app/admin/categories/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Category
    </a>
  </div>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded" class:bg-green-200={form?.success} class:text-green-800={form?.success} class:bg-red-200={!form?.success && form?.error} class:text-red-800={!form?.success && form?.error}>
      {displayMessage}
    </div>
  {/if}

  {#if data.categories && data.categories.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">Description</th>
            <th scope="col" class="px-6 py-3">Parent ID</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.categories as category (category.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{category.name}</td>
              <td class="px-6 py-4">{category.description || '-'}</td>
              <td class="px-6 py-4">{category.parent_id || 'None'}</td>
              <td class="px-6 py-4 flex space-x-2">
                <a href={`/app/admin/categories/${category.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>

                <form method="POST" action="?/delete&id={category.id}" use:enhance={({ form: currentForm }) => {
                  // The confirm dialog is outside enhance, so it runs before form submission.
                  // Enhance callback runs after the server action has responded.
                  return async ({ result, update }) => {
                    // result.type === 'success' (and status 303) => redirect, enhance doesn't need to do much.
                    // result.type === 'error' (e.g. fail(500)) => SvelteKit updates $page.error
                    // result.type === 'failure' (e.g. fail(400)) => SvelteKit updates the 'form' prop.

                    if (result.type === 'error') {
                      // This typically handles unexpected server errors or fail(500)
                      // The `form` store might not be populated by SvelteKit in this case,
                      // but $page.error will be.
                      // The reactive statement `$: if (form?.error) ...` might not catch this if 'form' isn't updated.
                      // The server now returns fail(500, {message: ...}), so result.error.message should be available.
                      alert(`Server Error: ${result.error.message}`);
                      displayMessage = `Server Error: ${result.error.message}`; // Update display message
                    } else if (result.type === 'failure') {
                      // This handles fail(400, { message: ... })
                      // SvelteKit automatically updates the `form` prop with result.data.
                      // The reactive `$: if (form?.message)` will update displayMessage.
                      // We can still use an alert for immediate feedback if desired.
                      if (result.data?.message) {
                        alert(`Could not delete: ${result.data.message}`);
                        // displayMessage will be updated by `$: if (form?.message)`
                      }
                    }
                    // No need to call update() explicitly if using fail/redirect,
                    // as SvelteKit handles form prop updates and page invalidation.
                    // However, if you need to ensure reactivity triggers based on `form` prop change
                    // after a 'failure', and it's not happening, then `update()` can be useful.
                    // Let's keep it to see its effect.
                    await update({ reset: false }); // reset: false to keep form data, true to clear.
                  };
                }}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this category? This action cannot be undone.');">
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
    <p class="text-center text-gray-500 py-8">No categories found.
      <a href="/app/admin/categories/new" class="text-blue-500 hover:underline">Add one!</a>
    </p>
  {/if}
</div>

<style>
  /* Basic Tailwind-like utility classes (actual Tailwind would be better) */
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
  .sm\:rounded-lg { border-radius: 0.5rem; } /* sm breakpoint typically 640px */
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
  .border-b { border-bottom-width: 1px; border-color: #E5E7EB; } /* Assuming default border color */
  .hover\:bg-gray-50:hover { background-color: #F9FAFB; }
  .font-medium { font-weight: 500; }
  .text-gray-900 { color: #111827; }
  .whitespace-nowrap { white-space: nowrap; }
  .space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem; } /* For spacing between buttons */
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
