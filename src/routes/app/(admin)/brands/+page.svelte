<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL, $app/state for Svelte 5 specific page store
  import type { PageData, ActionData } from './$types';
  // Snippet type is not directly used if not passing children explicitly to another component via $props

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Consolidate message display using $derived and $effect for Svelte 5
  let displayMessage = $state('');

  $effect(() => {
    let messages: string[] = [];
    if (form?.message) {
      messages.push(`Action: ${form.message}`); // Prefix to distinguish from URL message
    }

    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      messages.push(urlMessage);
      // Optional: Clear message from URL, needs careful implementation if done client-side
      // const currentUrl = new URL($page.url);
      // if (currentUrl.searchParams.has('message')) {
      //   currentUrl.searchParams.delete('message');
      //   window.history.replaceState(null, '', currentUrl.href);
      // }
    }
    displayMessage = messages.join('; ');
  });

  // Use $derived for brands if you need to react to data changes,
  // otherwise direct usage of data.brands is fine.
  let brands = $derived(data.brands);

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Brands</h1>
    <a href="/app/admin/brands/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Brand
    </a>
  </div>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-green-100={displayMessage.toLowerCase().includes("success")}
         class:text-green-700={displayMessage.toLowerCase().includes("success")}
         class:bg-red-100={!displayMessage.toLowerCase().includes("success") && displayMessage.toLowerCase().includes("fail")}
         class:text-red-700={!displayMessage.toLowerCase().includes("success") && displayMessage.toLowerCase().includes("fail")}
         class:bg-yellow-100={!displayMessage.toLowerCase().includes("success") && !displayMessage.toLowerCase().includes("fail")}
         class:text-yellow-700={!displayMessage.toLowerCase().includes("success") && !displayMessage.toLowerCase().includes("fail")}>
      {@html displayMessage.replace(/;/g, '<br>')}
    </div>
  {/if}

  {#if brands && brands.length > 0}
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
          {#each brands as brand (brand.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{brand.name}</td>
              <td class="px-6 py-4">
                {#if brand.logo_url}
                  <img src={brand.logo_url} alt="{brand.name} logo" style="max-height: 40px; max-width: 80px; object-fit: contain;" />
                {:else}
                  <span>No logo</span>
                {/if}
              </td>
              <td class="px-6 py-4 flex space-x-2">
                <a href={`/app/admin/brands/${brand.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>
                <form method="POST" action="?/delete&id={brand.id}" use:enhance={() => {
                  return async ({ result, update }) => {
                    // `form` prop will be updated automatically by SvelteKit on 'failure' or 'error' if action returns data.
                    // `displayMessage` will react to changes in `form` prop.
                    if (result.type === 'error') { // e.g. fail(500) or unexpected server error
                        alert(`Server Error: ${result.error.message}`);
                    } else if (result.type === 'failure') { // e.g. fail(400, 501)
                        if (result.data?.message) {
                            alert(`Could not delete: ${result.data.message}`);
                        } else {
                            alert('Could not delete brand due to a validation or server issue.');
                        }
                    } else if (result.type === 'success') {
                        // This block will likely not be hit if server redirects on actual success.
                        // Kept for placeholder actions that might return data.
                        if(result.data?.message) alert(result.data.message);
                        // If not redirecting, and need to refresh data:
                        // await invalidateAll(); // or invalidate('app:brands') if you set up custom invalidation
                    }
                    // update() can be called to force SvelteKit to re-evaluate after enhance, useful
                    // if not redirecting and form/data needs explicit refresh signal beyond prop changes.
                    // await update();
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this brand? This might orphan products or cause issues if not handled by database rules.');">
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

<!-- No component-specific <style> tags. Tailwind classes applied directly. -->
