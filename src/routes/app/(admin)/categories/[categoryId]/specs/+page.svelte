<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation'; // For refreshing data

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let category = $derived(data.category);
  let specFields = $derived(data.specFields);

  let displayMessage = $state('');

  $effect(() => {
    // This effect will run when `form` or `$page.url` changes.
    const messages = [];
    if (form?.message) {
      messages.push(`Action: ${form.message}`);
    }
    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      messages.push(urlMessage);
      // Consider clearing the URL message to prevent it from sticking on refresh
      // This needs to be done carefully to avoid infinite loops or broken history.
      // Example:
      // if ($page.url.searchParams.has('message')) {
      //   const newUrl = new URL($page.url);
      //   newUrl.searchParams.delete('message');
      //   window.history.replaceState(null, '', newUrl.href);
      // }
    }
    displayMessage = messages.join('; ');
  });

  // State for managing the "add/edit spec field" form
  let showSpecFieldForm = $state(false);
  let editingSpecField = $state<typeof data.specFields[0] | null>(null);

  let currentSpecFieldId = $state<string | null>(null); // For hidden input in edit mode
  let currentFieldLabel = $state('');
  let currentFieldName = $state(''); // Auto-generate from label, or manual
  let currentFieldType = $state('text'); // Default to 'text'
  let currentOptionsStr = $state(''); // Comma-separated for 'select' type
  let currentIsRequired = $state(false);
  let currentDisplayOrder = $state(0);

  // Helper to auto-generate field_name from field_label (kebab-case)
  function generateFieldName(label: string): string {
    return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  $effect(() => {
    if (showSpecFieldForm && !editingSpecField && currentFieldLabel) {
        currentFieldName = generateFieldName(currentFieldLabel);
    }
  });


  function openEditForm(fieldToEdit: typeof data.specFields[0]) {
    editingSpecField = fieldToEdit;
    currentSpecFieldId = fieldToEdit.id;
    currentFieldLabel = fieldToEdit.field_label;
    currentFieldName = fieldToEdit.field_name;
    currentFieldType = fieldToEdit.field_type;
    currentOptionsStr = (Array.isArray(fieldToEdit.options) ? fieldToEdit.options.join(', ') : '');
    currentIsRequired = fieldToEdit.is_required;
    currentDisplayOrder = fieldToEdit.display_order || 0;
    showSpecFieldForm = true;
    // Clear previous form action messages if any
    if(form) form.message = undefined;
    if(form) form.errors = undefined;
  }

  function openNewForm() {
    editingSpecField = null;
    currentSpecFieldId = null;
    currentFieldLabel = '';
    currentFieldName = '';
    currentFieldType = 'text';
    currentOptionsStr = '';
    currentIsRequired = false;
    currentDisplayOrder = (specFields?.length > 0 ? Math.max(...specFields.map(sf => sf.display_order || 0)) + 10 : 10);
    showSpecFieldForm = true;
    if(form) form.message = undefined;
    if(form) form.errors = undefined;
  }

  function closeForm() {
    showSpecFieldForm = false;
    editingSpecField = null;
  }

  // Effect to handle successful form submissions (e.g., close form, invalidate data)
  $effect(() => {
    if (form?.success) { // Assuming server action returns { success: true }
      closeForm();
      invalidateAll(); // Refresh data for the page
      // displayMessage will be updated by the $effect listening to $page.url if redirect has message
    }
  });

  const availableFieldTypes = ['text', 'number', 'select', 'checkbox', 'date', 'textarea', 'boolean'];

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-2">
    Specification Fields for <span class="font-bold text-indigo-600">{category?.name ?? 'Category'}</span>
  </h1>
  <p class="text-sm text-gray-600 mb-6">Category ID: {category?.id}</p>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm"
         class:bg-green-100={displayMessage.toLowerCase().includes("success")}
         class:text-green-700={displayMessage.toLowerCase().includes("success")}
         class:bg-red-100={!displayMessage.toLowerCase().includes("success")}
         class:text-red-700={!displayMessage.toLowerCase().includes("success")}>
      {@html displayMessage.replace(/;/g, '<br>')}
    </div>
  {/if}

  {#if !showSpecFieldForm}
    <button onclick={openNewForm} class="btn btn-primary mb-6">Add New Spec Field</button>
  {/if}

  <!-- Add/Edit Spec Field Form -->
  {#if showSpecFieldForm}
    <div class="spec-field-form bg-gray-50 p-6 rounded-lg shadow-md mb-8">
      <h2 class="text-xl font-semibold mb-4">{#if editingSpecField}Edit Spec Field: {editingSpecField.field_label}{:else}Add New Specification Field{/if}</h2>
      <form method="POST"
            action={editingSpecField ? `?/updateSpecField&specFieldId=${editingSpecField.id}` : "?/createSpecField"}
            use:enhance={() => {
              return async ({ result, update }) => {
                // `form` prop is automatically updated by SvelteKit on failure.
                // If action is successful and returns { success: true }, $effect handles it.
                if (result.type === 'error') {
                  alert(`Error: ${result.error.message}`);
                } else if (result.type === 'failure' && result.data?.message) {
                  // Error messages from `fail` are in `form.message` or `form.errors`
                  // `displayMessage` will pick up `form.message`
                }
                // update() can ensure client state reflects form prop changes
                // await update({ reset: !result.data?.errors }); // Reset form only if no validation errors
              };
            }}
            class="space-y-4">

        {#if editingSpecField && currentSpecFieldId}
          <input type="hidden" name="specFieldId" value={currentSpecFieldId} />
        {/if}

        <div>
          <label for="field_label" class="block text-sm font-medium text-gray-700">Field Label <span class="text-red-500">*</span></label>
          <input type="text" name="field_label" id="field_label" bind:value={currentFieldLabel} required class="input mt-1 block w-full {form?.errors?.field_label ? 'input-error' : ''}" />
          {#if form?.errors?.field_label}<p class="text-xs text-red-600 mt-1">{form.errors.field_label[0]}</p>{/if}
        </div>

        <div>
          <label for="field_name" class="block text-sm font-medium text-gray-700">Field Name (auto-generated, kebab-case) <span class="text-red-500">*</span></label>
          <input type="text" name="field_name" id="field_name" bind:value={currentFieldName} required readonly={!editingSpecField} class="input mt-1 block w-full bg-gray-100 {form?.errors?.field_name ? 'input-error' : ''}" />
          <p class="text-xs text-gray-500 mt-1">Unique identifier. Auto-generated from label for new fields. Cannot be changed after creation.</p>
          {#if form?.errors?.field_name}<p class="text-xs text-red-600 mt-1">{form.errors.field_name[0]}</p>{/if}
        </div>

        <div>
          <label for="field_type" class="block text-sm font-medium text-gray-700">Field Type <span class="text-red-500">*</span></label>
          <select name="field_type" id="field_type" bind:value={currentFieldType} required class="input mt-1 block w-full {form?.errors?.field_type ? 'input-error' : ''}">
            {#each availableFieldTypes as type (type)}
              <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            {/each}
          </select>
          {#if form?.errors?.field_type}<p class="text-xs text-red-600 mt-1">{form.errors.field_type[0]}</p>{/if}
        </div>

        {#if currentFieldType === 'select'}
          <div>
            <label for="options" class="block text-sm font-medium text-gray-700">Options (comma-separated for Select type)</label>
            <textarea name="options" id="options" rows="3" bind:value={currentOptionsStr} class="input mt-1 block w-full {form?.errors?.options ? 'input-error' : ''}" placeholder="e.g., Option 1, Option 2, Option 3"></textarea>
            {#if form?.errors?.options}<p class="text-xs text-red-600 mt-1">{form.errors.options[0]}</p>{/if}
          </div>
        {/if}

        <div class="flex items-center">
          <input type="checkbox" name="is_required" id="is_required" bind:checked={currentIsRequired} class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <label for="is_required" class="ml-2 block text-sm text-gray-900">Is this field required?</label>
        </div>

        <div>
          <label for="display_order" class="block text-sm font-medium text-gray-700">Display Order</label>
          <input type="number" name="display_order" id="display_order" bind:value={currentDisplayOrder} class="input mt-1 block w-full {form?.errors?.display_order ? 'input-error' : ''}" />
           <p class="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
          {#if form?.errors?.display_order}<p class="text-xs text-red-600 mt-1">{form.errors.display_order[0]}</p>{/if}
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button type="button" onclick={closeForm} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">{#if editingSpecField}Update Spec Field{:else}Create Spec Field{/if}</button>
        </div>
      </form>
    </div>
  {/if}

  <!-- List Existing Spec Fields -->
  <h2 class="text-xl font-semibold mt-8 mb-4">Current Specification Fields</h2>
  {#if specFields && specFields.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Order</th>
            <th scope="col" class="px-6 py-3">Label</th>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">Type</th>
            <th scope="col" class="px-6 py-3">Required</th>
            <th scope="col" class="px-6 py-3">Options</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each specFields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) as field (field.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4">{field.display_order ?? '-'}</td>
              <td class="px-6 py-4 font-medium text-gray-900">{field.field_label}</td>
              <td class="px-6 py-4 font-mono text-xs">{field.field_name}</td>
              <td class="px-6 py-4">{field.field_type}</td>
              <td class="px-6 py-4">{field.is_required ? 'Yes' : 'No'}</td>
              <td class="px-6 py-4 text-xs">{(Array.isArray(field.options) && field.options.length > 0) ? field.options.join(', ') : (field.field_type === 'select' ? 'No options' : 'N/A')}</td>
              <td class="px-6 py-4 flex space-x-2">
                <button onclick={() => openEditForm(field)} class="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <form method="POST" action="?/deleteSpecField&specFieldId={field.id}" use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'error') { alert(`Error: ${result.error.message}`); }
                    else if (result.type === 'failure' && result.data?.message) { alert(`Could not delete: ${result.data.message}`); }
                    // On success/redirect, SvelteKit handles refresh.
                    // Or call invalidateAll() if action returns success without redirect.
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium"
                          onclick="return confirm('Are you sure you want to delete this specification field?');">
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
    <p class="text-center text-gray-500 py-8">No specification fields defined for this category yet.</p>
  {/if}
</div>

<!-- Basic styles for input and error indication, assuming Tailwind is not fully set up or for overrides -->
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
  .container { max-width: 1280px; } .mx-auto { margin-left: auto; margin-right: auto; } .p-4 { padding: 1rem; } .p-6 { padding: 1.5rem; }
  .mb-2 { margin-bottom: 0.5rem; } .mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; } .mb-8 { margin-bottom: 2rem; } .mt-1 { margin-top: 0.25rem; } .mt-8 { margin-top: 2rem; }
  .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; } .text-xl { font-size: 1.25rem; line-height: 1.75rem; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; } .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; } .font-bold { font-weight: 700; } .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .text-indigo-600 { color: #4f46e5; } .text-gray-700 { color: #374151; } .text-gray-600 { color: #4b5563; } .text-gray-500 { color: #6b7280; } .text-red-500 { color: #ef4444; } .text-red-600 { color: #dc2626; }
  .bg-gray-50 { background-color: #f9fafb; } .rounded-lg { border-radius: 0.5rem; } .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .flex { display: flex; } .items-center { align-items: center; } .justify-between { justify-content: space-between; } .justify-end { justify-content: flex-end; } .space-x-2 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.5rem; } .space-x-3 > :not([hidden]) ~ :not([hidden]) { margin-left: 0.75rem; }
  .block { display: block; } .w-full { width: 100%; }
  .h-4 { height: 1rem; } .w-4 { width: 1rem; } .ml-2 { margin-left: 0.5rem; }
  .text-indigo-600 { color: #4f46e5; } .border-gray-300 { border-color: #d1d5db; } .rounded { border-radius: 0.25rem; } .focus\:ring-indigo-500:focus { --tw-ring-color: #6366f1; box-shadow: 0 0 0 2px var(--tw-ring-color); border-color: #6366f1; }
  .pt-4 { padding-top: 1rem; } .border-t { border-top-width: 1px; }
  .overflow-x-auto { overflow-x: auto; } .min-w-full { min-width: 100%; } .text-left { text-align: left; }
  .uppercase { text-transform: uppercase; } .bg-gray-50 { background-color: #f9fafb; } .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; } .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .bg-white { background-color: #ffffff; } .border-b { border-bottom-width: 1px; } .hover\:bg-gray-50:hover { background-color: #f9fafb; } .whitespace-nowrap { white-space: nowrap; }
  .text-blue-600 { color: #2563eb; } .hover\:text-blue-800:hover { color: #1e40af; } .text-red-600 { color: #dc2626; } .hover\:text-red-800:hover { color: #991b1b; }
  .text-center { text-align: center; } .py-8 { padding-top: 2rem; padding-bottom: 2rem; } .hover\:underline:hover { text-decoration: underline; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; } .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
</style>
