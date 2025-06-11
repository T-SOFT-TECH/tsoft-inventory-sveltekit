<script lang="ts">
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  // Initialize with form data if available (from a failed POST), otherwise use loaded category data
  let categoryName = $state(form?.name ?? data.category.name);
  let categoryDescription = $state(form?.description ?? data.category.description ?? '');
  let parentId = $state(form?.parent_id ?? data.category.parent_id ?? '');

  // General message display, excluding specific field errors handled below
  let displayMessage = $derived(form?.message && !form.missingName && !form.duplicateName && !form.selfParentError ? form.message : '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Edit Category: {data.category.name}</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-red-100={!form?.message?.toLowerCase().includes("success")}
         class:text-red-700={!form?.message?.toLowerCase().includes("success")}
         class:bg-green-100={form?.message?.toLowerCase().includes("success")}
         class:text-green-700={form?.message?.toLowerCase().includes("success")}>
      {displayMessage}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-md rounded-lg p-8">
    <input type="hidden" name="categoryId" value={data.category.id} />
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
      <input type="text" name="name" id="name" bind:value={categoryName} required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.missingName || form?.duplicateName ? 'border-red-500' : ''}" />
      {#if form?.missingName}
        <p class="mt-2 text-sm text-red-600">{form.message || 'Category name is required.'}</p>
      {:else if form?.duplicateName}
        <p class="mt-2 text-sm text-red-600">{form.message || 'A category with this name already exists.'}</p>
      {/if}
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea name="description" id="description" rows="4" bind:value={categoryDescription}
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
    </div>

    <div>
      <label for="parent_id" class="block text-sm font-medium text-gray-700">Parent Category (Optional)</label>
      <select name="parent_id" id="parent_id" bind:value={parentId}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.selfParentError ? 'border-red-500' : ''}">
        <option value="">-- None --</option>
        {#each data.potentialParents as parent (parent.id)}
          {#if parent.id !== data.category.id}
            <option value={parent.id} selected={parentId === parent.id.toString()}>{parent.name} ({parent.id})</option>
          {/if}
        {/each}
      </select>
      {#if form?.selfParentError}
        <p class="mt-2 text-sm text-red-600">{form.message || 'A category cannot be its own parent.'}</p>
      {/if}
    </div>

    <div class="flex items-center justify-end space-x-3 pt-4 border-t mt-6">
       <a href="/app/admin/categories" role="button" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Cancel
      </a>
      <button type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Update Category
      </button>
    </div>
  </form>
</div>

<!-- No <style> tags. Assuming Tailwind or global styles. -->
