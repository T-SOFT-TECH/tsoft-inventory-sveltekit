<script lang="ts">
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL params
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let invoices = $derived(data.invoices);

  let displayMessage = $state('');
  $effect(() => {
    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      displayMessage = urlMessage;
      // Optional: Clear message from URL after display
      // const currentUrl = new URL($page.url);
      // if (currentUrl.searchParams.has('message')) {
      //   currentUrl.searchParams.delete('message');
      //   window.history.replaceState(null, '', currentUrl.href);
      // }
    } else {
      displayMessage = '';
    }
  });

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    // Ensure date string is treated correctly, especially if it's just YYYY-MM-DD
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return 'N/A';
    return amount.toFixed(2); // Basic currency formatting, consider using Intl.NumberFormat
  }

</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-semibold">Invoices</h1>
    <a href="/app/pos" role="button" class="btn btn-primary">
      Create New Sale/Invoice
    </a>
  </div>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm bg-green-100 text-green-700 border border-green-200">
      {displayMessage}
    </div>
  {/if}

  {#if invoices && invoices.length > 0}
    <div class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Invoice #</th>
            <th scope="col" class="px-6 py-3">Customer</th>
            <th scope="col" class="px-6 py-3">Issue Date</th>
            <th scope="col" class="px-6 py-3 text-right">Total</th>
            <th scope="col" class="px-6 py-3">Status</th>
            <th scope="col" class="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each invoices as invoice (invoice.id)}
            <tr class="bg-white border-b hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                <a href={`/app/invoices/${invoice.id}`} class="text-blue-600 hover:underline">
                  {invoice.invoice_number}
                </a>
              </td>
              <td class="px-6 py-4">{invoice.customerName ?? 'N/A'}</td>
              <td class="px-6 py-4">{formatDate(invoice.issue_date)}</td>
              <td class="px-6 py-4 text-right">${formatCurrency(invoice.finalAmount)}</td>
              <td class="px-6 py-4">
                <span class="font-semibold px-2 py-0.5 rounded-full text-xs"
                      class:text-green-800={invoice.status === 'paid'} class:bg-green-200={invoice.status === 'paid'}
                      class:text-red-800={invoice.status === 'unpaid' || invoice.status === 'overdue'} class:bg-red-200={invoice.status === 'unpaid' || invoice.status === 'overdue'}
                      class:text-yellow-800={invoice.status === 'pending'} class:bg-yellow-200={invoice.status === 'pending'}
                      class:text-gray-800={!['paid', 'unpaid', 'overdue', 'pending'].includes(invoice.status ?? '')}
                      class:bg-gray-200={!['paid', 'unpaid', 'overdue', 'pending'].includes(invoice.status ?? '')}
                >{invoice.status?.toUpperCase() ?? 'N/A'}</span>
              </td>
              <td class="px-6 py-4">
                <a href={`/app/invoices/${invoice.id}`} role="button" class="text-blue-600 hover:text-blue-800 font-medium">View</a>
                <!-- Add other actions like "Download PDF" or "Mark as Paid" later -->
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-center text-gray-500 py-8">No invoices found.</p>
  {/if}
</div>

<style>
  /* Basic styles - assuming Tailwind handles most. */
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; border-width: 1px; border-style: solid; cursor: pointer; }
  .btn-primary { background-color: #4F46E5; color: white; border-color: transparent; }
  .btn-primary:hover { background-color: #4338CA; }

  /* Tailwind placeholder classes (actual Tailwind setup would handle these) */
  .container { max-width: 1280px; } .mx-auto { margin-left: auto; margin-right: auto; } .p-4 { padding: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; }
  .flex { display: flex; } .justify-between { justify-content: space-between; } .items-center { align-items: center; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; } .font-semibold { font-weight: 600; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; } .border { border-width: 1px;} .border-green-200 {border-color: #bbf7d0;}
  .overflow-x-auto { overflow-x: auto; } .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); } .sm\:rounded-lg { border-radius: 0.5rem; }
  .min-w-full { min-width: 100%; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; } .text-left { text-align: left; } .text-gray-500 { color: #6b7280; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; } .text-gray-700 { color: #374151; } .uppercase { text-transform: uppercase; } .bg-gray-50 { background-color: #f9fafb; }
  .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; } .py-4 { padding-top: 1rem; padding-bottom: 1rem; } .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; } .py-0\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
  .bg-white { background-color: #ffffff; } .border-b { border-bottom-width: 1px; border-color: #e5e7eb; } .hover\:bg-gray-50:hover { background-color: #f9fafb; }
  .font-medium { font-weight: 500; } .text-gray-900 { color: #111827; } .whitespace-nowrap { white-space: nowrap; }
  .text-blue-600 { color: #2563eb; } .hover\:underline:hover { text-decoration: underline; } .hover\:text-blue-800:hover { color: #1e40af; }
  .text-right { text-align: right; } .rounded-full { border-radius: 9999px; }
  .text-green-800 { color: #065f46; } .bg-green-200 { background-color: #a7f3d0; }
  .text-red-800 { color: #991b1b; } .bg-red-200 { background-color: #fecaca; }
  .text-yellow-800 { color: #854d0e; } .bg-yellow-200 { background-color: #fef08a; }
  .text-gray-800 { color: #1f2937;} .bg-gray-200 { background-color: #e5e7eb;}
  .text-center { text-align: center; } .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
</style>
