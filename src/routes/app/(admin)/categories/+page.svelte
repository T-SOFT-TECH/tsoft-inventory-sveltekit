<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';
  import { onMount } from 'svelte'; // onMount is not Svelte 5 idiomatic for this, $effect is preferred

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state('');

  // Svelte 5: $effect is preferred over onMount for reactions to prop/store changes
  $effect(() => {
    const messages = [];
    // Check form messages first, as they are more immediate from an action
    if (form?.message) {
      messages.push(form.message);
    }

    // Then check URL parameters, which might be from a redirect
    // This check should ideally only run once after a redirect or be idempotent
    const url = new URL($page.url); // Use $page.url directly inside $effect
    const urlMessage = url.searchParams.get('message');
    if (urlMessage) {
      messages.push(urlMessage);
      // Optional: Clear message from URL to prevent it from re-appearing on refresh
      // This part needs careful handling to avoid continuous history updates if not done correctly
      // if ($page.url.searchParams.has('message')) { // Check if param still exists
      //   const newUrl = new URL($page.url);
      //   newUrl.searchParams.delete('message');
      //   window.history.replaceState(window.history.state, '', newUrl.href);
      // }
    }
    displayMessage = messages.join('; ');
  });

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Categories</h1>
    <a href="/app/admin/categories/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Category
    </a>
  </div>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-green-100={displayMessage.toLowerCase().includes("success")}
         class:text-green-700={displayMessage.toLowerCase().includes("success")}
         class:bg-red-100={!displayMessage.toLowerCase().includes("success")}
         class:text-red-700={!displayMessage.toLowerCase().includes("success")}>
      {@html displayMessage.replace(/;/g, '<br>')} <!-- Display multiple messages if any -->
    </div>
  {/if}

  {#if data.categories && data.categories.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">Description</th>
            <th scope="col" class="px-6 py-3">Parent Category</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.categories as category (category.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{category.name}</td>
              <td class="px-6 py-4">{category.description || '-'}</td>
              <td class="px-6 py-4">{category.parent_name || (category.parent_id ? `ID: ${category.parent_id}` : 'None')}</td>
              <td class="px-6 py-4 flex space-x-2">
                <a href={`/app/admin/categories/${category.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>
                <form method="POST" action="?/delete&id={category.id}" use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'error') { // Server error or fail(500)
                      alert(`Server Error: ${result.error.message}`);
                    } else if (result.type === 'failure') { // fail(4xx)
                      if (result.data?.message) {
                        alert(`Could not delete: ${result.data.message}`);
                      } else {
                        alert('Could not delete category due to a validation error.');
                      }
                    }
                    // On success (redirect), SvelteKit handles page reload.
                    // `form` prop is updated automatically by SvelteKit on `failure`.
                    // `update()` can be called to ensure client state reflects changes if needed,
                    // but often not necessary with redirects or automatic form prop updates.
                    // await update({ reset: false });
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this category? This action cannot be undone and might affect products if not handled by database rules.');">
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

<!-- No <style> tags. Assuming Tailwind or global styles. -->
