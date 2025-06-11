<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state('');
  let customerIdForDeletionConfirmation = $state<string | null>(null);
  let confirmationMessage = $state('');

  $effect(() => {
    if (customerIdForDeletionConfirmation) {
      displayMessage = ''; // Clear general messages when confirmation dialog is active
      return;
    }
    let messages: string[] = [];
    if (form?.message && form.actionType !== 'deleteCustomerWithSales') { // Avoid showing old messages after confirmation
      messages.push(`Action: ${form.message}`);
    }

    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      messages.push(urlMessage);
    }
    displayMessage = messages.join('; ');
  });

  let customers = $derived(data.customers);

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Manage Customers</h1>
    <a href="/app/customers/new" role="button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      New Customer
    </a>
  </div>

  {#if customerIdForDeletionConfirmation}
    <div class="confirm-dialog bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 my-4 shadow-md" role="alert">
      <div class="flex">
        <div class="py-1"><svg class="fill-current h-6 w-6 text-orange-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg></div>
        <div>
          <p class="font-bold">Confirmation Required</p>
          <p class="text-sm">{confirmationMessage}</p>
          <form method="POST" action="?/delete&id={customerIdForDeletionConfirmation}&confirmOrphanSales=true" use:enhance={() => {
              return async ({ result, update }) => {
                  if (result.type === 'error') {
                      alert('Error: ' + result.error.message);
                  } else if (result.type === 'failure' && result.data?.message) {
                      alert('Could not delete: ' + result.data.message);
                  }
                  // On success, page reloads due to redirect.
                  // Or if not redirecting, main list enhance should update.
                  customerIdForDeletionConfirmation = null; // Hide dialog
                  // await update(); // May not be needed due to redirect or main form's update
              };
          }} class="mt-3">
              <button type="submit" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm">
                Yes, Delete Customer and Orphan Sales
              </button>
              <button type="button" class="ml-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded text-sm"
                      onclick={() => customerIdForDeletionConfirmation = null}>
                Cancel
              </button>
          </form>
        </div>
      </div>
    </div>
  {/if}

  {#if displayMessage && !customerIdForDeletionConfirmation}
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

  {#if customers && customers.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Name</th>
            <th scope="col" class="px-6 py-3">Email</th>
            <th scope="col" class="px-6 py-3">Phone</th>
            <th scope="col" class="px-6 py-3">City</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each customers as customer (customer.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{customer.name}</td>
              <td class="px-6 py-4">{customer.email ?? 'N/A'}</td>
              <td class="px-6 py-4">{customer.phone ?? 'N/A'}</td>
              <td class="px-6 py-4">{customer.city ?? 'N/A'}</td>
              <td class="px-6 py-4 flex space-x-2 justify-start">
                <a href={`/app/customers/${customer.id}/edit`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">Edit</a>
                <form method="POST" action="?/delete&id={customer.id}" use:enhance={({ form: currentFormEl }) => {
                  return async ({ result, update }) => {
                    if (result.type === 'failure' && result.data?.requiresConfirmation) {
                      confirmationMessage = result.data.message;
                      customerIdForDeletionConfirmation = result.data.customerId;
                      // Do not call update() here to prevent form prop from being immediately updated,
                      // which might clear the confirmation dialog if displayMessage logic depends on form.
                    } else if (result.type === 'error') {
                      alert('Error: ' + result.error.message);
                      customerIdForDeletionConfirmation = null;
                    } else if (result.type === 'failure' && result.data?.message) {
                      alert('Could not delete: ' + result.data.message);
                      customerIdForDeletionConfirmation = null;
                    } else if (result.type === 'success') {
                      // Usually a redirect occurs from server, page reloads.
                      // If action returned data (e.g. placeholder), handle here.
                      if(result.data?.message) displayMessage = result.data.message;
                      customerIdForDeletionConfirmation = null;
                      // await invalidateAll(); // Or specific invalidation if not redirecting
                    }
                    // update({ reset: false }); // Reset form if needed, or let SvelteKit handle it
                  };
                }}>
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-center text-gray-500 py-8">No customers found.
      <a href="/app/customers/new" class="text-blue-500 hover:underline">Add one!</a>
    </p>
  {/if}
</div>

<!-- No component-specific <style> tags. Tailwind classes applied directly. -->
