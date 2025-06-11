<script lang="ts">
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Initialize $state variables for form fields.
  // Prioritize `form` data (if available from a failed POST) over `data.brand` (from initial load).
  let brandName = $state(form?.name ?? data.brand.name);
  let logoUrl = $state(form?.logo_url ?? data.brand.logo_url ?? '');

  // Derived states for specific error messages
  let nameError = $derived(
    form?.missingName ? 'Brand name is required.' :
    form?.duplicateName ? 'A brand with this name already exists.' : ''
  );
  let urlError = $derived(
    form?.invalidUrl ? (form?.message || 'Invalid Logo URL format. Please include http:// or https://') : ''
  );

  // General message display for other errors or success messages not covered by specific field errors
  // (though success typically redirects, this could be for non-redirecting success actions if any)
  let displayMessage = $derived(form?.message && !nameError && !urlError ? form.message : '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Edit Brand: {data.brand.name}</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-red-100={!!form && !!form.message && !form.message.toLowerCase().includes("success")}
         class:text-red-700={!!form && !!form.message && !form.message.toLowerCase().includes("success")}
         class:bg-green-100={!!form && form.message?.toLowerCase().includes("success")}
         class:text-green-700={!!form && form.message?.toLowerCase().includes("success")}>
      {displayMessage}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-md rounded-lg p-8">
    <!-- No need for hidden brandId input as it's part of the route params and available in server action -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
      <input type="text" name="name" id="name" bind:value={brandName} required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {nameError ? 'border-red-500' : ''}" />
      {#if nameError}
        <p class="mt-2 text-sm text-red-600">{nameError}</p>
      {/if}
    </div>

    <div>
      <label for="logo_url" class="block text-sm font-medium text-gray-700">Logo URL (Optional)</label>
      <input type="url" name="logo_url" id="logo_url" placeholder="https://example.com/logo.png" bind:value={logoUrl}
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {urlError ? 'border-red-500' : ''}" />
      {#if urlError}
        <p class="mt-2 text-sm text-red-600">{urlError}</p>
      {/if}
    </div>

    <div class="flex items-center justify-end space-x-3 pt-4 border-t mt-6">
      <a href="/app/admin/brands" role="button" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Cancel
      </a>
      <button type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Update Brand
      </button>
    </div>
  </form>
</div>

<!-- No <style> tags. Assuming Tailwind or global styles. -->
