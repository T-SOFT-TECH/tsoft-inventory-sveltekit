<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms'; // For progressive enhancement

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Initialize form fields with $state. Prioritize `form.fields` (if action failed) over `data.product`.
  let name = $state(form?.fields?.name ?? data.product.name);
  let sku = $state(form?.fields?.sku ?? data.product.sku);
  let description = $state(form?.fields?.description ?? data.product.description ?? '');
  let categoryId = $state(form?.fields?.category_id ?? data.product.category_id ?? '');
  let brandId = $state(form?.fields?.brand_id ?? data.product.brand_id ?? '');
  let purchasePrice = $state(form?.fields?.purchase_price ?? data.product.purchase_price ?? '');
  let sellingPrice = $state(form?.fields?.selling_price ?? data.product.selling_price); // selling_price is required
  let currentStock = $state(form?.fields?.current_stock ?? data.product.current_stock ?? '0');

  // Handle array and object fields carefully for string conversion and back
  let imageUrlsStr = $state(form?.fields?.image_urls ?? (Array.isArray(data.product.image_urls) ? data.product.image_urls.join(', ') : ''));
  let specificationsStr = $state(form?.fields?.specifications ?? (typeof data.product.specifications === 'object' && data.product.specifications !== null ? JSON.stringify(data.product.specifications, null, 2) : ''));

  // Derived error messages for specific fields
  let nameError = $derived(form?.errors?.name?.[0] ?? '');
  let skuError = $derived(form?.errors?.sku?.[0] ?? '');
  let categoryIdError = $derived(form?.errors?.category_id?.[0] ?? '');
  let brandIdError = $derived(form?.errors?.brand_id?.[0] ?? '');
  let sellingPriceError = $derived(form?.errors?.selling_price?.[0] ?? '');
  let currentStockError = $derived(form?.errors?.current_stock?.[0] ?? '');
  let purchasePriceError = $derived(form?.errors?.purchase_price?.[0] ?? '');
  let imageUrlsError = $derived(form?.errors?.image_urls?.[0] ?? ''); // If server validates parsed array
  let specificationsError = $derived(form?.errors?.specifications?.[0] ?? ''); // If server validates parsed object

  let displayMessage = $derived(form?.message && !nameError && !skuError && !categoryIdError && !brandIdError && !sellingPriceError && !currentStockError && !specificationsError ? form.message : form?.errors?._general?.[0] ?? '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Edit Product: {data.product.name} (SKU: {data.product.sku})</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm {form?.errors ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
      {displayMessage}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-xl rounded-lg p-8" use:enhance>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Product Name <span class="text-red-500">*</span></label>
        <input type="text" name="name" id="name" bind:value={name} required
               class="mt-1 block w-full input {nameError ? 'input-error' : ''}" />
        {#if nameError}<p class="mt-1 text-xs text-red-600">{nameError}</p>{/if}
      </div>
      <div>
        <label for="sku" class="block text-sm font-medium text-gray-700">SKU <span class="text-red-500">*</span></label>
        <input type="text" name="sku" id="sku" bind:value={sku} required
               class="mt-1 block w-full input {skuError ? 'input-error' : ''}" />
        {#if skuError}<p class="mt-1 text-xs text-red-600">{skuError}</p>{/if}
      </div>
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea name="description" id="description" rows="4" bind:value={description}
                class="mt-1 block w-full input"></textarea>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="category_id" class="block text-sm font-medium text-gray-700">Category <span class="text-red-500">*</span></label>
        <select name="category_id" id="category_id" bind:value={categoryId} required
                class="mt-1 block w-full input {categoryIdError ? 'input-error' : ''}">
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
                class="mt-1 block w-full input {brandIdError ? 'input-error' : ''}">
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
               class="mt-1 block w-full input {purchasePriceError ? 'input-error' : ''}" />
        {#if purchasePriceError}<p class="mt-1 text-xs text-red-600">{purchasePriceError}</p>{/if}
      </div>
      <div>
        <label for="selling_price" class="block text-sm font-medium text-gray-700">Selling Price <span class="text-red-500">*</span></label>
        <input type="number" name="selling_price" id="selling_price" step="0.01" min="0" bind:value={sellingPrice} required
               class="mt-1 block w-full input {sellingPriceError ? 'input-error' : ''}" />
        {#if sellingPriceError}<p class="mt-1 text-xs text-red-600">{sellingPriceError}</p>{/if}
      </div>
      <div>
        <label for="current_stock" class="block text-sm font-medium text-gray-700">Current Stock <span class="text-red-500">*</span></label>
        <input type="number" name="current_stock" id="current_stock" step="1" min="0" bind:value={currentStock} required
               class="mt-1 block w-full input {currentStockError ? 'input-error' : ''}" />
        {#if currentStockError}<p class="mt-1 text-xs text-red-600">{currentStockError}</p>{/if}
      </div>
    </div>

    <div>
      <label for="image_urls" class="block text-sm font-medium text-gray-700">Image URLs (comma-separated)</label>
      <textarea name="image_urls" id="image_urls" rows="3" bind:value={imageUrlsStr} placeholder="https://example.com/image1.jpg, https://example.com/image2.png"
                class="mt-1 block w-full input {imageUrlsError ? 'input-error' : ''}"></textarea>
      {#if imageUrlsError}<p class="mt-1 text-xs text-red-600">{imageUrlsError}</p>{/if}
    </div>

    <div>
      <label for="specifications" class="block text-sm font-medium text-gray-700">Specifications (JSON format)</label>
      <textarea name="specifications" id="specifications" rows="5" bind:value={specificationsStr} placeholder='{"key": "value", "feature": "detail"}'
                class="mt-1 block w-full input {specificationsError ? 'input-error' : ''}"></textarea>
      {#if specificationsError}<p class="mt-1 text-xs text-red-600">{specificationsError}</p>{/if}
    </div>

    <div class="flex items-center justify-end space-x-4 pt-6 border-t mt-8">
      <a href="/app/admin/products" role="button" class="btn btn-secondary">Cancel</a>
      <button type="submit" class="btn btn-primary">Update Product</button>
    </div>
  </form>
</div>

<!-- Basic styles for input and error indication, assuming Tailwind is not fully set up or for overrides -->
<style>
  .input {
    padding: 0.5rem 0.75rem;
    border-width: 1px;
    border-color: #D1D5DB; /* border-gray-300 */
    border-radius: 0.375rem; /* rounded-md */
    box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); /* shadow-sm */
  }
  .input:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    --tw-ring-color: #6366F1; /* ring-indigo-500 */
    box-shadow: 0 0 0 2px var(--tw-ring-color);
    border-color: #6366F1; /* border-indigo-500 */
  }
  .input-error {
    border-color: #EF4444; /* border-red-500 */
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 600;
    text-decoration: none; /* For <a> styled as button */
    display: inline-block; /* For <a> */
    text-align: center; /* For <a> */
    border-width: 1px;
    border-style: solid;
  }
  .btn-primary {
    background-color: #4F46E5; /* bg-indigo-600 */
    color: white;
    border-color: transparent;
  }
  .btn-primary:hover {
    background-color: #4338CA; /* hover:bg-indigo-700 */
  }
  .btn-secondary {
    background-color: white;
    color: #374151; /* text-gray-700 */
    border-color: #D1D5DB; /* border-gray-300 */
  }
  .btn-secondary:hover {
    background-color: #F9FAFB; /* hover:bg-gray-50 */
  }
  /* Tailwind placeholder classes (actual Tailwind setup would handle these) */
  .container { max-width: 1280px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .p-4 { padding: 1rem; }
  .p-8 { padding: 2rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-6 { padding-top: 1.5rem; }
  .mt-8 { margin-top: 2rem; }
  .border-t { border-top-width: 1px; border-color: #e5e7eb; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .block { display: block; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .font-medium { font-weight: 500; }
  .text-gray-700 { color: #374151; }
  .text-red-500 { color: #EF4444; } /* For '*' indicator */
  .text-red-600 { color: #DC2626; } /* For error messages */
  .mt-1 { margin-top: 0.25rem; }
  .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
  .rounded-lg { border-radius: 0.5rem; }
  .grid { display: grid; }
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; }
  .items-center { align-items: center; }
  .justify-end { justify-content: flex-end; }
  .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .bg-red-100 { background-color: #fee2e2; }
  .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; }
  .text-green-700 { color: #15803d; }
</style>
