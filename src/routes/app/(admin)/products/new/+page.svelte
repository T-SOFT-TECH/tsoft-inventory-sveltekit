<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms'; // For progressive enhancement if desired, though not strictly required by prompt

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Initialize form fields with $state, using `form` data on error or empty strings
  let name = $state(form?.fields?.name ?? '');
  let sku = $state(form?.fields?.sku ?? '');
  let description = $state(form?.fields?.description ?? '');
  let categoryId = $state(form?.fields?.category_id ?? '');
  let brandId = $state(form?.fields?.brand_id ?? '');
  let purchasePrice = $state(form?.fields?.purchase_price ?? '');
  let sellingPrice = $state(form?.fields?.selling_price ?? '');
  let currentStock = $state(form?.fields?.current_stock ?? '0'); // Default to '0' as it's numeric
  let imageUrlsStr = $state(form?.fields?.image_urls ?? ''); // Comma-separated
  let specificationsStr = $state(form?.fields?.specifications ?? ''); // JSON string

  // Derived error messages for specific fields
  let nameError = $derived(form?.errors?.name?.[0] ?? '');
  let skuError = $derived(form?.errors?.sku?.[0] ?? '');
  let categoryIdError = $derived(form?.errors?.category_id?.[0] ?? '');
  let brandIdError = $derived(form?.errors?.brand_id?.[0] ?? '');
  let sellingPriceError = $derived(form?.errors?.selling_price?.[0] ?? '');
  let currentStockError = $derived(form?.errors?.current_stock?.[0] ?? '');
  let purchasePriceError = $derived(form?.errors?.purchase_price?.[0] ?? '');
  let imageUrlsError = $derived(form?.errors?.image_urls?.[0] ?? '');
  let specificationsError = $derived(form?.errors?.specifications?.[0] ?? '');

  // General message for other errors or success (though success redirects)
  let displayMessage = $derived(form?.message && !nameError && !skuError && !categoryIdError && !brandIdError && !sellingPriceError && !currentStockError && !specificationsError ? form.message : form?.errors?._general?.[0] ?? '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Create New Product</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-red-100={!form?.message?.toLowerCase().includes("success")}
         class:text-red-700={!form?.message?.toLowerCase().includes("success")}
         class:bg-green-100={form?.message?.toLowerCase().includes("success")}
         class:text-green-700={form?.message?.toLowerCase().includes("success")}>
      {displayMessage}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-xl rounded-lg p-8" use:enhance>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Product Name <span class="text-red-500">*</span></label>
        <input type="text" name="name" id="name" bind:value={name} required
               class="mt-1 block w-full px-3 py-2 border {nameError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        {#if nameError}<p class="mt-1 text-xs text-red-600">{nameError}</p>{/if}
      </div>

      <div>
        <label for="sku" class="block text-sm font-medium text-gray-700">SKU (Stock Keeping Unit) <span class="text-red-500">*</span></label>
        <input type="text" name="sku" id="sku" bind:value={sku} required
               class="mt-1 block w-full px-3 py-2 border {skuError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        {#if skuError}<p class="mt-1 text-xs text-red-600">{skuError}</p>{/if}
      </div>
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea name="description" id="description" rows="4" bind:value={description}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="category_id" class="block text-sm font-medium text-gray-700">Category <span class="text-red-500">*</span></label>
        <select name="category_id" id="category_id" bind:value={categoryId} required
                class="mt-1 block w-full px-3 py-2 border {categoryIdError ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Category --</option>
          {#each data.categories as category (category.id)}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
        {#if categoryIdError}<p class="mt-1 text-xs text-red-600">{categoryIdError}</p>{/if}
      </div>

      <div>
        <label for="brand_id" class="block text-sm font-medium text-gray-700">Brand <span class="text-red-500">*</span></label>
        <select name="brand_id" id="brand_id" bind:value={brandId} required
                class="mt-1 block w-full px-3 py-2 border {brandIdError ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">-- Select Brand --</option>
          {#each data.brands as brand (brand.id)}
            <option value={brand.id}>{brand.name}</option>
          {/each}
        </select>
        {#if brandIdError}<p class="mt-1 text-xs text-red-600">{brandIdError}</p>{/if}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label for="purchase_price" class="block text-sm font-medium text-gray-700">Purchase Price</label>
        <input type="number" name="purchase_price" id="purchase_price" step="0.01" min="0" bind:value={purchasePrice}
               class="mt-1 block w-full px-3 py-2 border {purchasePriceError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        {#if purchasePriceError}<p class="mt-1 text-xs text-red-600">{purchasePriceError}</p>{/if}
      </div>
      <div>
        <label for="selling_price" class="block text-sm font-medium text-gray-700">Selling Price <span class="text-red-500">*</span></label>
        <input type="number" name="selling_price" id="selling_price" step="0.01" min="0" bind:value={sellingPrice} required
               class="mt-1 block w-full px-3 py-2 border {sellingPriceError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        {#if sellingPriceError}<p class="mt-1 text-xs text-red-600">{sellingPriceError}</p>{/if}
      </div>
      <div>
        <label for="current_stock" class="block text-sm font-medium text-gray-700">Initial Stock <span class="text-red-500">*</span></label>
        <input type="number" name="current_stock" id="current_stock" step="1" min="0" bind:value={currentStock} required
               class="mt-1 block w-full px-3 py-2 border {currentStockError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        {#if currentStockError}<p class="mt-1 text-xs text-red-600">{currentStockError}</p>{/if}
      </div>
    </div>

    <div>
      <label for="image_urls" class="block text-sm font-medium text-gray-700">Image URLs (comma-separated)</label>
      <textarea name="image_urls" id="image_urls" rows="3" bind:value={imageUrlsStr} placeholder="https://example.com/image1.jpg, https://example.com/image2.png"
                class="mt-1 block w-full px-3 py-2 border {imageUrlsError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      {#if imageUrlsError}<p class="mt-1 text-xs text-red-600">{imageUrlsError}</p>{/if}
    </div>

    <div>
      <label for="specifications" class="block text-sm font-medium text-gray-700">Specifications (JSON format)</label>
      <textarea name="specifications" id="specifications" rows="5" bind:value={specificationsStr} placeholder='{"key1": "value1", "key2": "value2"}'
                class="mt-1 block w-full px-3 py-2 border {specificationsError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      {#if specificationsError}<p class="mt-1 text-xs text-red-600">{specificationsError}</p>{/if}
    </div>

    <div class="flex items-center justify-end space-x-4 pt-6 border-t mt-8">
      <a href="/app/admin/products" role="button" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Cancel
      </a>
      <button type="submit"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Create Product
      </button>
    </div>
  </form>
</div>

<!-- No <style> tags. Assuming Tailwind or global styles handle utility classes. -->
