<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // For URL, not $app/state here
  import { onMount } from 'svelte'; // For initial category_id tracking

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Standard product fields
  let name = $state(form?.fields?.name ?? data.product.name);
  let sku = $state(form?.fields?.sku ?? data.product.sku);
  let description = $state(form?.fields?.description ?? data.product.description ?? '');
  let currentCategoryId = $state(form?.fields?.category_id ?? data.product.category_id ?? ''); // Bound to select
  let brandId = $state(form?.fields?.brand_id ?? data.product.brand_id ?? '');
  let purchasePrice = $state(form?.fields?.purchase_price ?? data.product.purchase_price ?? '');
  let sellingPrice = $state(form?.fields?.selling_price ?? data.product.selling_price);
  let currentStock = $state(form?.fields?.current_stock ?? data.product.current_stock ?? '0');
  let imageUrlsStr = $state(form?.fields?.image_urls ?? (Array.isArray(data.product.image_urls) ? data.product.image_urls.join(', ') : ''));
  // The main `specifications` field (general JSON) is not explicitly bound here if we are fully replacing it with dynamic fields.
  // If it's meant to co-exist, it needs its own $state and input. For now, assuming dynamic fields replace it.
  // let generalSpecificationsStr = $state(form?.fields?.specifications ?? (typeof data.product.specifications === 'object' && data.product.specifications !== null && !Object.keys(data.product.specifications).some(k => k.startsWith('spec_')) ? JSON.stringify(data.product.specifications, null, 2) : ''));


  // State for dynamic category-specific fields
  type SpecFieldDef = {
    id: string;
    field_label: string;
    field_name: string;
    field_type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea' | 'boolean';
    options: string[] | null; // Parsed JSON array from DB
    is_required: boolean;
  };
  let currentCategorySpecFields = $state<SpecFieldDef[]>(data.categorySpecDefinitions || []);
  let dynamicSpecValues = $state<Record<string, any>>({});
  let specFetchError = $state<string | null>(null);
  let initialCategoryIdOnLoad = data.product.category_id; // To compare against currentCategoryId

  // Initialize dynamicSpecValues from data.product.specifications based on initial categorySpecDefinitions
  $effect(() => {
    const initialValues: Record<string, any> = {};
    const productSpecs = data.product.specifications || {};
    const formFields = form?.fields || {};

    for (const field of data.categorySpecDefinitions || []) {
      const formFieldName = `spec_${field.field_name}`;
      if (formFields[formFieldName] !== undefined) {
        // Value from a failed form submission takes precedence
        initialValues[field.field_name] = field.field_type === 'checkbox' || field.field_type === 'boolean'
            ? (formFields[formFieldName] === 'on' || formFields[formFieldName] === true || formFields[formFieldName] === 'true')
            : formFields[formFieldName];
      } else if (productSpecs[field.field_name] !== undefined) {
        initialValues[field.field_name] = productSpecs[field.field_name];
      } else {
        initialValues[field.field_name] = field.field_type === 'checkbox' || field.field_type === 'boolean' ? false : '';
      }
    }
    dynamicSpecValues = initialValues;
  });


  // Fetch new category-specific fields when currentCategoryId changes
  $effect(async () => {
    const catId = currentCategoryId;
    if (catId && catId !== initialCategoryIdOnLoad) { // Only fetch if category actually changes from initial
      specFetchError = null;
      try {
        const response = await fetch(`/api/admin/category-specs/${catId}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch specs: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const specs: SpecFieldDef[] = await response.json();
        currentCategorySpecFields = specs;

        const newDynamicValues: Record<string, any> = {};
        for (const field of specs) {
          // When category changes, reset spec values to default for the new category's fields
          // Or, try to match if field_name is the same? For now, reset.
          newDynamicValues[field.field_name] = field.field_type === 'checkbox' || field.field_type === 'boolean' ? false : '';
        }
        dynamicSpecValues = newDynamicValues;

      } catch (err: any) {
        console.error("Error fetching category specs on change:", err);
        specFetchError = err.message || "An unknown error occurred while fetching new specifications.";
        currentCategorySpecFields = []; // Clear on error
        dynamicSpecValues = {};
      }
    } else if (!catId) { // No category selected
      currentCategorySpecFields = [];
      dynamicSpecValues = {};
      specFetchError = null;
    } else if (catId === initialCategoryIdOnLoad && currentCategorySpecFields.length === 0 && (data.categorySpecDefinitions || []).length > 0) {
      // This handles the case where the effect runs before initial data.categorySpecDefinitions is fully processed by the first effect
      // or if catId is re-selected to the initial one after being changed.
      currentCategorySpecFields = data.categorySpecDefinitions || [];
      // Re-initialize dynamicSpecValues as in the first effect
      const initialValuesReapply: Record<string, any> = {};
      const productSpecsReapply = data.product.specifications || {};
      for (const field of currentCategorySpecFields) {
        initialValuesReapply[field.field_name] = productSpecsReapply[field.field_name] !== undefined
            ? productSpecsReapply[field.field_name]
            : (field.field_type === 'checkbox' || field.field_type === 'boolean' ? false : '');
      }
      dynamicSpecValues = initialValuesReapply;
    }
  });

  // Derived error messages
  let nameError = $derived(form?.errors?.name?.[0] ?? '');
  let skuError = $derived(form?.errors?.sku?.[0] ?? '');
  // ... other fixed field errors

  let displayMessage = $derived(form?.message ?? (new URL($page.url).searchParams.get('message') || ''));

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Edit Product: <span class="font-normal italic">{data.product.name} (SKU: {data.product.sku})</span></h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm {form?.errors || (form?.message && !form.message.toLowerCase().includes('success')) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
      {displayMessage}
    </div>
  {/if}
  {#if specFetchError}
    <div class="mb-4 p-3 rounded text-sm bg-red-100 text-red-700">
      Error related to category specifications: {specFetchError}
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
        <select name="category_id" id="category_id" bind:value={currentCategoryId} required class="input mt-1 block w-full {form?.errors?.category_id ? 'input-error' : ''}">
          <option value="">-- Select Category --</option>
          {#each data.categories as category (category.id)}<option value={category.id}>{category.name}</option>{/each}
        </select>
        {#if form?.errors?.category_id}<p class="mt-1 text-xs text-red-600">{form.errors.category_id[0]}</p>{/if}
      </div>
      <div>
        <label for="brand_id" class="block text-sm font-medium text-gray-700">Brand <span class="text-red-500">*</span></label>
        <select name="brand_id" id="brand_id" bind:value={brandId} required class="input mt-1 block w-full {form?.errors?.brand_id ? 'input-error' : ''}">
          <option value="">-- Select Brand --</option>
          {#each data.brands as brand (brand.id)}<option value={brand.id}>{brand.name}</option>{/each}
        </select>
        {#if form?.errors?.brand_id}<p class="mt-1 text-xs text-red-600">{form.errors.brand_id[0]}</p>{/if}
      </div>
    </div>
     <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label for="purchase_price" class="block text-sm font-medium">Purchase Price</label>
        <input type="number" name="purchase_price" id="purchase_price" bind:value={purchasePrice} step="0.01" min="0" class="input mt-1 block w-full {form?.errors?.purchase_price ? 'input-error' : ''}" />
        {#if form?.errors?.purchase_price}<p class="mt-1 text-xs text-red-600">{form.errors.purchase_price[0]}</p>{/if}
      </div>
      <div>
        <label for="selling_price" class="block text-sm font-medium">Selling Price <span class="text-red-500">*</span></label>
        <input type="number" name="selling_price" id="selling_price" bind:value={sellingPrice} required step="0.01" min="0" class="input mt-1 block w-full {form?.errors?.selling_price ? 'input-error' : ''}" />
        {#if form?.errors?.selling_price}<p class="mt-1 text-xs text-red-600">{form.errors.selling_price[0]}</p>{/if}
      </div>
      <div>
        <label for="current_stock" class="block text-sm font-medium">Current Stock <span class="text-red-500">*</span></label>
        <input type="number" name="current_stock" id="current_stock" bind:value={currentStock} required step="1" min="0" class="input mt-1 block w-full {form?.errors?.current_stock ? 'input-error' : ''}" />
        {#if form?.errors?.current_stock}<p class="mt-1 text-xs text-red-600">{form.errors.current_stock[0]}</p>{/if}
      </div>
    </div>
    <div>
      <label for="image_urls_str" class="block text-sm font-medium">Image URLs (comma-separated)</label> <!-- Name matches Zod schema -->
      <textarea name="image_urls_str" id="image_urls_str" rows="2" bind:value={imageUrlsStr} placeholder="https://ex.com/img1.jpg, https://ex.com/img2.png" class="input mt-1 block w-full"></textarea>
    </div>

    {!-- Dynamic Category-Specific Fields --}
    {#if currentCategorySpecFields.length > 0}
      <fieldset class="mt-6 border border-gray-300 p-4 rounded-md">
        <legend class="text-lg font-medium text-gray-700 px-2">
          Category Specifics: {data.categories.find(c=>c.id === currentCategoryId)?.name ?? data.product.categories?.name ?? ''}
        </legend>
        {#each currentCategorySpecFields as field (field.id)}
          <div class="mb-4">
            <label for={`spec_${field.field_name}`} class="block text-sm font-medium text-gray-700 capitalize">
              {field.field_label}{#if field.is_required}<span class="text-red-500"> *</span>{/if}
            </label>
            {#if field.field_type === 'text'}
              <input type="text" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} class="input mt-1 block w-full {form?.errors?.[`spec_${field.field_name}`] ? 'input-error' : ''}" />
            {:else if field.field_type === 'number'}
              <input type="number" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} step="any" class="input mt-1 block w-full {form?.errors?.[`spec_${field.field_name}`] ? 'input-error' : ''}" />
            {:else if field.field_type === 'date'}
              <input type="date" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                     required={field.is_required} class="input mt-1 block w-full {form?.errors?.[`spec_${field.field_name}`] ? 'input-error' : ''}" />
            {:else if field.field_type === 'checkbox' || field.field_type === 'boolean'}
              <input type="checkbox" name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:checked={dynamicSpecValues[field.field_name]}
                     class="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 {form?.errors?.[`spec_${field.field_name}`] ? 'border-red-500' : ''}" />
            {:else if field.field_type === 'textarea'}
              <textarea name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} rows="3" bind:value={dynamicSpecValues[field.field_name]}
                        required={field.is_required} class="input mt-1 block w-full {form?.errors?.[`spec_${field.field_name}`] ? 'input-error' : ''}"></textarea>
            {:else if field.field_type === 'select' && field.options}
              <select name={`spec_${field.field_name}`} id={`spec_${field.field_name}`} bind:value={dynamicSpecValues[field.field_name]}
                      required={field.is_required} class="input mt-1 block w-full {form?.errors?.[`spec_${field.field_name}`] ? 'input-error' : ''}">
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
      <button type="submit" class="btn btn-primary">Update Product</button>
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
  /* Minimal structural classes if Tailwind is not fully integrated in preview */
  .container { max-width: 1280px; margin-left: auto; margin-right: auto; padding: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mt-6 { margin-top: 1.5rem; } .mt-8 { margin-top: 2rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-6 { padding-top: 1.5rem; } .border-t { border-top-width: 1px; border-color: #e5e7eb;}
  .text-2xl { font-size: 1.5rem; } .text-lg { font-size: 1.125rem; } .text-sm { font-size: 0.875rem; } .text-xs { font-size: 0.75rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; } .italic { font-style: italic; } .font-normal { font-weight: normal; }
  .text-gray-700 { color: #374151; } .text-red-500 { color: #EF4444; } .text-red-600 { color: #DC2626; }
  .mt-1 { margin-top: 0.25rem; } .block { display: block; } .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); } .rounded-lg { border-radius: 0.5rem; }
  .grid { display: grid; } .md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; } .items-center { align-items: center; } .justify-end { justify-content: flex-end; } .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .h-4 { height: 1rem; } .w-4 { width: 1rem; } .text-indigo-600 { color: #4f46e5; } .border-gray-300 { border-color: #d1d5db; } .rounded { border-radius: 0.25rem; } .focus\:ring-indigo-500:focus { --tw-ring-color: #6366f1; }
  fieldset { border-width: 1px; border-color: #D1D5DB; padding: 1rem; border-radius: 0.375rem; }
  legend { padding: 0 0.5rem; font-weight: 500; } .capitalize { text-transform: capitalize; }
</style>
