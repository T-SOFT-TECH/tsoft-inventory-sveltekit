<script>
  /** @type {import('./$types').PageData} */
  export let data; // Contains category and potentialParents from load

  /** @type {import('./$types').ActionData} */
  export let form; // Contains data from form submission if it failed

  // Initial values for the form, potentially overridden by 'form' if validation failed
  let currentName = form?.name ?? data.category.name;
  let currentDescription = form?.description ?? data.category.description ?? '';
  let currentParentId = form?.parent_id ?? data.category.parent_id ?? "";

  // $: console.log('Form data on error:', form);
  // $: console.log('Initial category data:', data.category);
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Edit Category: {data.category.name}</h1>

  {#if form?.message && !form?.missingName && !form?.duplicateName}
    <div class="mb-4 p-3 rounded"
         class:bg-red-200={!form?.success} class:text-red-800={!form?.success}
         class:bg-green-200={form?.success} class:text-green-800={form?.success}>
      {form.message}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-md rounded-lg p-8">
    <input type="hidden" name="categoryId" value={data.category.id} />

    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
      <input type="text" name="name" id="name" bind:value={currentName} required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.missingName || form?.duplicateName ? 'border-red-500' : ''}" />
      {#if form?.missingName}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {:else if form?.duplicateName}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {/if}
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea name="description" id="description" rows="4" bind:value={currentDescription}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
    </div>

    <div>
      <label for="parent_id" class="block text-sm font-medium text-gray-700">Parent Category (Optional)</label>
      <select name="parent_id" id="parent_id" bind:value={currentParentId}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <option value="">-- None --</option>
        {#each data.potentialParents as parent (parent.id)}
          {#if parent.id !== data.category.id} <!-- Double check to prevent self as parent -->
            <option value={parent.id}>{parent.name} ({parent.id})</option>
          {/if}
        {/each}
      </select>
       {#if form?.message && form.message.includes("cannot be its own parent")}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {/if}
    </div>

    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
      <a href="/app/admin/categories" class="text-gray-600 hover:text-gray-800 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50">
        Cancel
      </a>
      <button type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Update Category
      </button>
    </div>
  </form>
</div>

<!-- Re-using some Tailwind-like classes from previous pages for consistency -->
<style>
  .container { max-width: 1280px; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .p-4 { padding: 1rem; }
  .p-8 { padding: 2rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-4 { padding-top: 1rem; }
  .border-t { border-top-width: 1px; }
  .border-gray-200 { border-color: #E5E7EB; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .block { display: block; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .font-medium { font-weight: 500; }
  .text-gray-700 { color: #374151; }
  .text-red-500 { color: #EF4444; }
  .mt-1 { margin-top: 0.25rem; }
  .w-full { width: 100%; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .border { border-width: 1px; }
  .border-gray-300 { border-color: #D1D5DB; }
  .rounded-md { border-radius: 0.375rem; }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .focus\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
  .focus\:ring-indigo-500:focus { --tw-ring-color: #6366F1; box-shadow: 0 0 0 2px var(--tw-ring-color); }
  .focus\:border-indigo-500:focus { border-color: #6366F1; }
  .border-red-500 { border-color: #EF4444; }
  .mt-2 { margin-top: 0.5rem; }
  .text-red-600 { color: #DC2626; }
  .bg-white { background-color: #ffffff; }
  .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .rounded-lg { border-radius: 0.5rem; }
  .flex { display: flex; }
  .items-center { align-items: center; }
  .justify-end { justify-content: flex-end; }
  .space-x-3 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.75rem; }
  .text-gray-600 { color: #4B5563; }
  .hover\:text-gray-800:hover { color: #1F2937; }
  .hover\:bg-gray-50:hover { background-color: #F9FAFB; }
  .bg-blue-600 { background-color: #2563EB; }
  .hover\:bg-blue-700:hover { background-color: #1D4ED8; }
  .text-white { color: #ffffff; }
  .focus\:ring-2:focus {}
  .focus\:ring-offset-2:focus {}
  .focus\:ring-blue-500:focus { --tw-ring-color: #3B82F6; }
  .bg-red-200 { background-color: #FECACA; }
  .text-red-800 { color: #991B1B; }
  .bg-green-200 { background-color: #A7F3D0; }
  .text-green-800 { color: #065F46; }
</style>
