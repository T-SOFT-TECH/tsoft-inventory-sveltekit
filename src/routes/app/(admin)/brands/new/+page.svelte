<script>
  /** @type {import('./$types').ActionData} */
  export let form; // Contains data from form submission if it failed

  // $: console.log('Form data on new page:', form); // For debugging
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Create New Brand</h1>

  {#if form?.message && !form?.missingName && !form?.duplicateName && !form?.invalidUrl}
    <div class="mb-4 p-3 rounded text-white"
         class:bg-red-500={form?.message && !form.message.toLowerCase().includes("success")}
         class:bg-green-500={form?.message && form.message.toLowerCase().includes("success")}>
      {form.message}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-md rounded-lg p-8">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
      <input type="text" name="name" id="name" value={form?.name ?? ''} required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.missingName || form?.duplicateName ? 'border-red-500' : ''}" />
      {#if form?.missingName}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {:else if form?.duplicateName}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {/if}
    </div>

    <div>
      <label for="logo_url" class="block text-sm font-medium text-gray-700">Logo URL (Optional)</label>
      <input type="url" name="logo_url" id="logo_url" placeholder="https://example.com/logo.png" value={form?.logo_url ?? ''}
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.invalidUrl ? 'border-red-500' : ''}" />
      {#if form?.invalidUrl}
        <p class="mt-2 text-sm text-red-600">{form.message}</p>
      {/if}
    </div>

    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
      <a href="/app/admin/brands" class="text-gray-600 hover:text-gray-800 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50">
        Cancel
      </a>
      <button type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Create Brand
      </button>
    </div>
  </form>
</div>

<!-- Re-using some Tailwind-like classes for consistency -->
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
  .text-red-500 { color: #EF4444; } /* For '*' indicator */
  .text-red-600 { color: #DC2626; } /* For error messages */
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
  .border-red-500 { border-color: #EF4444; } /* For input error border */
  .mt-2 { margin-top: 0.5rem; }
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
  .bg-red-500 { background-color: #EF4444; } /* For general error message background */
  .bg-green-500 { background-color: #22C55E; } /* For general success message background */
</style>
