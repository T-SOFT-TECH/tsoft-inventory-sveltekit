<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // For reading URL if needed, not directly $app/state here

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Form fields from PageData (categories, brands)
  // Standard product fields
  let name = $state(form?.fields?.name ?? '');
  let sku = $state(form?.fields?.sku ?? '');
  let description = $state(form?.fields?.description ?? '');
  let categoryId = $state(form?.fields?.category_id ?? ''); // This will trigger the $effect
  let brandId = $state(form?.fields?.brand_id ?? '');
  let purchasePrice = $state(form?.fields?.purchase_price ?? '');
  let sellingPrice = $state(form?.fields?.selling_price ?? '');
  let currentStock = $state(form?.fields?.current_stock ?? '0');
  let imageUrlsStr = $state(form?.fields?.image_urls ?? '');
  let specificationsStr = $state(form?.fields?.specifications ?? ''); // Standard, non-dynamic specs

  // State for dynamic category-specific fields
  type SpecField = {
    id: string;
    field_label: string;
    field_name: string;
    field_type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea' | 'boolean';
    options: string[] | null; // Parsed from JSON string if stored as such, or directly array
    is_required: boolean;
    // any other properties like display_order
  };
  let categorySpecFields = $state<SpecField[]>([]);
  let dynamicSpecValues = $state<Record<string, any>>({});
  let specFetchError = $state<string | null>(null);

  // Fetch category-specific fields when categoryId changes
  $effect(async () => {
    const currentCategoryId = categoryId; // Capture current value for async operation
    if (currentCategoryId) {
      specFetchError = null;
      try {
        const response = await fetch(`/api/admin/category-specs/${currentCategoryId}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch specs: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const specs: SpecField[] = await response.json();
        categorySpecFields = specs;

        // Initialize dynamicSpecValues based on fetched specs
        const newDynamicValues: Record<string, any> = {};
        for (const field of specs) {
          // Use form?.fields?.[`spec_${field.field_name}`] if available (repopulating after validation error)
          // otherwise, set default based on field type
          const formValue = form?.fields?.[`spec_${field.field_name}`];
          if (formValue !== undefined) {
            newDynamicValues[field.field_name] = field.field_type === 'checkbox' ? (formValue === 'on' || formValue === true) : formValue;
          } else {
            newDynamicValues[field.field_name] = field.field_type === 'checkbox' || field.field_type === 'boolean' ? false : '';
          }
        }
        dynamicSpecValues = newDynamicValues;

      } catch (err: any) {
        console.error("Error fetching category specs:", err);
        specFetchError = err.message || "An unknown error occurred while fetching specifications.";
        categorySpecFields = [];
        dynamicSpecValues = {};
      }
    } else {
      categorySpecFields = [];
      dynamicSpecValues = {};
      specFetchError = null;
    }
  });

  // Derived error messages for standard fields
  let nameError = $derived(form?.errors?.name?.[0] ?? '');
  let skuError = $derived(form?.errors?.sku?.[0] ?? '');
  let categoryIdError = $derived(form?.errors?.category_id?.[0] ?? '');
  let brandIdError = $derived(form?.errors?.brand_id?.[0] ?? '');
  let sellingPriceError = $derived(form?.errors?.selling_price?.[0] ?? '');
  let currentStockError = $derived(form?.errors?.current_stock?.[0] ?? '');
  let specificationsError = $derived(form?.errors?.specifications?.[0] ?? ''); // For the main JSON spec field

  let displayMessage = $derived(form?.message && !nameError && !skuError && !categoryIdError && !brandIdError && !sellingPriceError && !currentStockError && !specificationsError ? form.message : form?.errors?._general?.[0] ?? '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Create New Product</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm {form?.errors || (form?.message && !form.message.toLowerCase().includes('success')) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
      {displayMessage}
    </div>
  {/if}
  {#if specFetchError}
    <div class="mb-4 p-3 rounded text-sm bg-red-100 text-red-700">
      Error loading category specifications: {specFetchError}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-xl rounded-lg p-8" use:enhance>

    {!-- Standard Product Fields --}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Product Name <span class="text-red-500">*</span></label>
        <input type="text" name="name" id="name" bind:value={name} required class="input mt-1 block w-full {nameError ? 'input-error' : ''}" />
        {#if nameError}<p class="mt-1 text-xs text-red-600">{nameError}</p>{/if}
      </div>
      <div>
        <label for="sku" class="block text-sm font-medium text-gray-700">SKU <span class="text-red-500">*</span></label>
        <input type="text" name="sku" id="sku" bind:value={sku} required class="input mt-1 block w-full {skuError ? 'input-error' : ''}" />
        {#if skuError}<p class="mt-1 text-xs text-red-600">{skuError}</p>{/if}
      </div>
    </div>
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea name="description" id="description" rows="3" bind:value={description} class="input mt-1 block w-full"></textarea>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="category_id" class="block text-sm font-medium text-gray-700">Category <span class="text-red-500">*</span></label>
        <select name="category_id" id="category_id" bind:value={categoryId} required class="input mt-1 block w-full {categoryIdError ? 'input-error' : ''}">
          <option value="">-- Select Category --</option>
          {#each data.categories as category (category.id)}<option value={category.id}>{category.name}</option>{/each}
        </select>
        {#if categoryIdError}<p class="mt-1 text-xs text-red-600">{categoryIdError}</p>{/if}
      </div>
      <div>
        <label for="brand_id" class="block text-sm font-medium text-gray-700">Brand <span class="text-red-500">*</span></label>
        <select name="brand_id" id="brand_id" bind:value={brandId} required class="input mt-1 block w-full {brandIdError ? 'input-error' : ''}">
          <option value="">-- Select Brand --</option>
          {#each data.brands as brand (brand.id)}<option value={brand.id}>{brand.name}</option>{/each}
        </select>
        {#if brandIdError}<p class="mt-1 text-xs text-red-600">{brandIdError}</p>{/if}
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label for="purchase_price" class="block text-sm font-medium">Purchase Price</label>
        <input type="number" name="purchase_price" id="purchase_price" bind:value={purchasePrice} step="0.01" min="0" class="input mt-1 block w-full" />
      </div>
      <div>
        <label for="selling_price" class="block text-sm font-medium">Selling Price <span class="text-red-500">*</span></label>
        <input type="number" name="selling_price" id="selling_price" bind:value={sellingPrice} required step="0.01" min="0" class="input mt-1 block w-full {sellingPriceError ? 'input-error' : ''}" />
        {#if sellingPriceError}<p class="mt-1 text-xs text-red-600">{sellingPriceError}</p>{/if}
      </div>
      <div>
        <label for="current_stock" class="block text-sm font-medium">Initial Stock <span class="text-red-500">*</span></label>
        <input type="number" name="current_stock" id="current_stock" bind:value={currentStock} required step="1" min="0" class="input mt-1 block w-full {currentStockError ? 'input-error' : ''}" />
        {#if currentStockError}<p class="mt-1 text-xs text-red-600">{currentStockError}</p>{/if}
      </div>
    </div>
    <div>
      <label for="image_urls" class="block text-sm font-medium">Image URLs (comma-separated)</label>
      <textarea name="image_urls" id="image_urls" rows="2" bind:value={imageUrlsStr} placeholder="https://ex.com/img1.jpg, https://ex.com/img2.png" class="input mt-1 block w-full"></textarea>
    </div>

    {!-- Main JSON Specifications Textarea --}
    <div>
      <label for="specifications" class="block text-sm font-medium">General Specifications (JSON format)</label>
      <textarea name="specifications" id="specifications" rows="3" bind:value={specificationsStr} placeholder='{"key": "value", "feature": "detail"}' class="input mt-1 block w-full {specificationsError ? 'input-error' : ''}"></textarea>
      {#if specificationsError}<p class="mt-1 text-xs text-red-600">{specificationsError}</p>{/if}
    </div>

    {!-- Dynamic Category-Specific Fields --}
    {#if categorySpecFields.length > 0}
      <fieldset class="mt-6 border border-gray-300 p-4 rounded-md">
        <legend class="text-lg font-medium text-gray-700 px-2">Category Specifics: {data.categories.find(c=>c.id === categoryId)?.name ?? ''}</legend>
        {#each categorySpecFields as field (field.id)}
          <div class="mb-4">
            <label for={`spec_${field.field_name}`} class="block text-sm font-medium text-gray-700">
              {field.field_label}{#if field.is_required}<span class="text-red-500"> *</span>{/if}
            </label>
            {#if field.field_type === 'text'}
              <input type="text" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} class="input mt-1 block w-full" />
            {:else if field.field_type === 'number'}
              <input type="number" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} class="input mt-1 block w-full" />
            {:else if field.field_type === 'date'}
              <input type="date" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} class="input mt-1 block w-full" />
            {:else if field.field_type === 'checkbox' || field.field_type === 'boolean'}
              <input type="checkbox" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:checked={dynamicSpecValues[field.field_name]}
                     class="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            {:else if field.field_type === 'textarea'}
              <textarea name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} rows="3" bind:value={dynamicSpecValues[field.field_name]}
                        required={field.is_required} class="input mt-1 block w-full"></textarea>
            {:else if field.field_type === 'select' && field.options}
              <select name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                      required={field.is_required} class="input mt-1 block w-full">
                <option value="">-- Select {field.field_label} --</option>
                {#each field.options as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {/if}
            {#if form?.errors?.[`spec_${field.field_name}`]}
              <p class="mt-1 text-xs text-red-600">{form.errors[`spec_${field.field_name}`][0]}</p>
            {/if}
          </div>
        {/each}
      </fieldset>
    {/if}

    <div class="flex items-center justify-end space-x-4 pt-6 border-t mt-8">
      <a href="/app/admin/products" role="button" class="btn btn-secondary">Cancel</a>
      <button type="submit" class="btn btn-primary">Create Product</button>
    </div>
  </form>
</div>

<style>
  .input { padding: 0.5rem 0.75rem; border-width: 1px; border-color: #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .input:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-color: #6366F1; box-shadow: 0 0 0 2px var(--tw-ring-color); border-color: #6366F1; }
  .input-error { border-color: #EF4444; }
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; border-width: 1px; border-style: solid; cursor: pointer; }
  .btn-primary { background-color: #4F46E5; color: white; border-color: transparent; }
  .btn-primary:hover { background-color: #4338CA; }
  .btn-secondary { background-color: white; color: #374151; border-color: #D1D5DB; }
  .btn-secondary:hover { background-color: #F9FAFB; }
  /* Tailwind placeholder classes */
  .container { max-width: 1280px; } .mx-auto { margin-left: auto; margin-right: auto; } .p-4 { padding: 1rem; } .p-8 { padding: 2rem; }
  .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mt-6 { margin-top: 1.5rem; } .mt-8 { margin-top: 2rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-6 { padding-top: 1.5rem; } .border-t { border-top-width: 1px; border-color: #e5e7eb;}
  .text-2xl { font-size: 1.5rem; line-height: 2rem; } .text-lg { font-size: 1.125rem; line-height: 1.75rem; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; } .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
  .text-gray-700 { color: #374151; } .text-red-500 { color: #EF4444; } .text-red-600 { color: #DC2626; }
  .mt-1 { margin-top: 0.25rem; } .block { display: block; } .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); } .rounded-lg { border-radius: 0.5rem; }
  .grid { display: grid; } .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; } .items-center { align-items: center; } .justify-end { justify-content: flex-end; } .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .h-4 { height: 1rem; } .w-4 { width: 1rem; } .text-indigo-600 { color: #4f46e5; } .border-gray-300 { border-color: #d1d5db; } .rounded { border-radius: 0.25rem; } .focus\:ring-indigo-500:focus { --tw-ring-color: #6366f1; }
  fieldset { border-width: 1px; border-color: #D1D5DB; padding: 1rem; border-radius: 0.375rem; }
  legend { padding: 0 0.5rem; font-weight: 500; }
</style>
