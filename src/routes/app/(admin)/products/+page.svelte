<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL; for Svelte 5 page state use $app/state
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state('');

  $effect(() => {
    let messages: string[] = [];
    if (form?.message) {
      messages.push(`Action: ${form.message}`);
    }

    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      messages.push(urlMessage);
      // Optional: Clear message from URL
      // const currentUrl = new URL($page.url);
      // if (currentUrl.searchParams.has('message')) {
      //   currentUrl.searchParams.delete('message');
      //   window.history.replaceState(null, '', currentUrl.href);
      // }
    }
    displayMessage = messages.join('; ');
  });

  let products = $derived(data.products);

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Products</h1>
    <a href="/app/admin/products/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Product
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

  {#if products && products.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">SKU</th>
            <th scope="col" class="px-6 py-3">Category</th>
            <th scope="col" class="px-6 py-3">Brand</th>
            <th scope="col" class="px-6 py-3 text-right">Price</th>
            <th scope="col" class="px-6 py-3 text-right">Stock</th>
            <th scope="col" class="px-6 py-3">Specifications</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each products as product (product.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{product.name}</td>
              <td class="px-6 py-4">{product.sku ?? 'N/A'}</td>
              <td class="px-6 py-4">{product.categories?.name ?? 'N/A'}</td>
              <td class="px-6 py-4">{product.brands?.name ?? 'N/A'}</td>
              <td class="px-6 py-4 text-right">{product.selling_price != null ? product.selling_price.toFixed(2) : 'N/A'}</td>
              <td class="px-6 py-4 text-right">{product.current_stock ?? 'N/A'}</td>
              <td class="px-6 py-4 text-xs">
                {#if product.specifications && Object.keys(product.specifications).length > 0}
                  <pre class="whitespace-pre-wrap bg-gray-50 p-1 rounded">{JSON.stringify(product.specifications, null, 2)}</pre>
                {:else}
                  N/A
                {/if}
              </td>
              <td class="px-6 py-4 flex space-x-2 justify-end">
                <a href={`/app/admin/products/${product.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>
                <form method="POST" action="?/delete&id={product.id}" use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'error') {
                        alert(`Server Error: ${result.error.message}`);
                    } else if (result.type === 'failure') {
                        if (result.data?.message) {
                            alert(`Could not delete: ${result.data.message}`);
                        } else {
                            alert('Could not delete product due to a validation or server issue.');
                        }
                    } else if (result.type === 'success') {
                        if(result.data?.message) alert(result.data.message); // For placeholder actions
                        // On actual success with redirect, this won't be hit.
                        // If not redirecting: await invalidateAll();
                    }
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this product? This action cannot be undone.');">
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
    <p class="text-center text-gray-500 py-8">No products found.
      <a href="/app/admin/products/new" class="text-blue-500 hover:underline">Add one!</a>
    </p>
  {/if}
</div>

<!-- No component-specific <style> tags. Tailwind classes applied directly. -->
