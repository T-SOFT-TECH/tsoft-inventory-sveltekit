<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores'; // For URL message if needed

  let { data }: { data: PageData } = $props();

  let invoice = $derived(data.invoice);
  let items = $derived(data.items);

  // The 'sales' object is nested within 'invoice' from the server load
  let sale = $derived(invoice.sales);

  // Customer data can come from two sources:
  // 1. Snapshot on the invoice itself (preferred for historical accuracy)
  // 2. Live customer data joined from the sale record (if snapshot is missing or for comparison)
  let customerDisplay = $derived(
    invoice.customer_details_snapshot || sale?.customers
  );
  // If both are null/undefined, customerDisplay will be null.

  let companyDetails = $derived(invoice.company_details_snapshot);

  // For messages from redirects (e.g., after sale creation)
  let displayMessage = $state('');
  $effect(() => {
    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      displayMessage = urlMessage;
    }
  });

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return 'N/A'; // Handles both null and undefined
    return amount.toFixed(2); // Basic currency formatting
  }

</script>

<div class="invoice-container bg-white shadow-lg rounded-lg p-6 md:p-10 max-w-4xl mx-auto my-8 print-area">

  {#if displayMessage}
    <div class="mb-6 p-4 rounded text-sm bg-green-100 text-green-700 border border-green-200">
      {displayMessage}
    </div>
  {/if}

  <!-- Invoice Header -->
  <header class="invoice-header grid grid-cols-2 gap-4 mb-10 pb-6 border-b">
    <div>
      {#if companyDetails}
        <h1 class="text-2xl font-bold text-gray-800">{companyDetails.name ?? 'Your Company'}</h1>
        <p class="text-sm text-gray-600">{companyDetails.address ?? '123 Business Rd, City'}</p>
        <p class="text-sm text-gray-600">Phone: {companyDetails.phone ?? 'N/A'}</p>
        <p class="text-sm text-gray-600">Email: {companyDetails.email ?? 'N/A'}</p>
      {:else}
        <h1 class="text-2xl font-bold text-gray-800">Company Details Unavailable</h1>
      {/if}
    </div>
    <div class="text-right">
      <h2 class="text-3xl font-semibold text-gray-700 uppercase tracking-wider">Invoice</h2>
      <p class="text-sm text-gray-500">No: <span class="font-medium text-gray-700">{invoice.invoice_number}</span></p>
      <p class="text-sm text-gray-500">Date: <span class="font-medium text-gray-700">{formatDate(invoice.issue_date)}</span></p>
      {#if invoice.due_date}
        <p class="text-sm text-gray-500">Due Date: <span class="font-medium text-gray-700">{formatDate(invoice.due_date)}</span></p>
      {/if}
      <p class="text-sm text-gray-500 mt-1">Status:
        <span class="font-semibold px-2 py-0.5 rounded-full text-xs"
              class:text-green-800={invoice.status === 'paid'} class:bg-green-200={invoice.status === 'paid'}
              class:text-red-800={invoice.status === 'unpaid' || invoice.status === 'overdue'} class:bg-red-200={invoice.status === 'unpaid' || invoice.status === 'overdue'}
              class:text-yellow-800={invoice.status === 'pending'} class:bg-yellow-200={invoice.status === 'pending'}
        >{invoice.status?.toUpperCase() ?? 'N/A'}</span>
      </p>
    </div>
  </header>

  <!-- Customer Details -->
  <section class="customer-details grid grid-cols-2 gap-4 mb-8">
    <div>
      <h3 class="text-sm font-semibold text-gray-500 uppercase mb-1">Bill To:</h3>
      {#if customerDisplay}
        <p class="font-medium text-gray-800">{customerDisplay.name ?? 'Walk-in Customer'}</p>
        {#if customerDisplay.address_line1}
          <p class="text-sm text-gray-600">{customerDisplay.address_line1}</p>
          {#if customerDisplay.address_line2}<p class="text-sm text-gray-600">{customerDisplay.address_line2}</p>{/if}
          <p class="text-sm text-gray-600">
            {customerDisplay.city ?? ''}{#if customerDisplay.city && customerDisplay.postal_code}, {/if}{customerDisplay.postal_code ?? ''}
          </p>
          <p class="text-sm text-gray-600">{customerDisplay.country ?? ''}</p>
        {/if}
        {#if customerDisplay.email}<p class="text-sm text-gray-600">Email: {customerDisplay.email}</p>{/if}
        {#if customerDisplay.phone}<p class="text-sm text-gray-600">Phone: {customerDisplay.phone}</p>{/if}
      {:else}
         <p class="font-medium text-gray-800">Walk-in Customer</p>
         <p class="text-sm text-gray-500 italic">No specific customer details on record for this sale.</p>
      {/if}
    </div>
    {#if sale}
    <div class="text-right md:text-left md:pl-10"> <!-- Adjust alignment based on design preference -->
        <h3 class="text-sm font-semibold text-gray-500 uppercase mb-1">Sale Information:</h3>
        <p class="text-sm text-gray-600">Sale ID: <span class="font-mono text-xs">{sale.id}</span></p>
        <p class="text-sm text-gray-600">Processed by: {sale.users?.email ?? 'N/A'}</p>
        <p class="text-sm text-gray-600">Payment Method: {sale.payment_method?.toUpperCase() ?? 'N/A'}</p>
    </div>
    {/if}
  </section>

  <!-- Line Items Table -->
  <section class="line-items mb-8">
    <h3 class="text-lg font-semibold text-gray-700 mb-3 sr-only">Items</h3>
    <div class="overflow-x-auto border rounded-md">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
            <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
            <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each items as item (item.id)}
            <tr>
              <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.products?.name ?? 'Product Name Missing'}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.products?.sku ?? 'N/A'}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(item.unit_price_at_sale)}</td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(item.total_price_for_item)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Totals Section -->
  {#if sale}
  <section class="totals-section grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
    <div class="md:col-start-2 lg:col-start-3 col-span-2">
        <div class="space-y-1 text-sm">
            <div class="flex justify-between">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-medium text-gray-800">${formatCurrency(sale.total_amount)}</span>
            </div>
            {#if sale.discount_amount > 0}
            <div class="flex justify-between">
                <span class="text-gray-600">Discount:</span>
                <span class="font-medium text-red-600">-${formatCurrency(sale.discount_amount)}</span>
            </div>
            {/if}
            {#if sale.tax_amount > 0}
            <div class="flex justify-between">
                <span class="text-gray-600">Tax:</span>
                <span class="font-medium text-gray-800">${formatCurrency(sale.tax_amount)}</span>
            </div>
            {/if}
            <div class="flex justify-between text-lg font-bold border-t pt-2 mt-1">
                <span class="text-gray-800">Grand Total:</span>
                <span class="text-gray-900">${formatCurrency(sale.final_amount)}</span>
            </div>
        </div>
    </div>
  </section>
  {/if}

  <!-- Notes Section -->
  {#if invoice.notes || sale?.notes}
    <section class="notes-section mb-8">
      <h3 class="text-sm font-semibold text-gray-500 uppercase mb-1">Notes:</h3>
      {#if invoice.notes}<p class="text-sm text-gray-600">{invoice.notes}</p>{/if}
      {#if sale?.notes && sale.notes !== invoice.notes}<p class="text-sm text-gray-600">{sale.notes}</p>{/if}
    </section>
  {/if}

  <!-- Footer / Actions -->
  <footer class="invoice-footer mt-10 pt-6 border-t text-center print-hide">
    <p class="text-sm text-gray-600 mb-4">Thank you for your business!</p>
    <button type="button" onclick={() => window.print()}
            class="btn btn-primary py-2 px-4 mr-2">
      Print Invoice
    </button>
    <a href="/app/invoices" role="button" class="btn btn-secondary py-2 px-4">
      Back to Invoices List
    </a>
     <a href="/app/pos" role="button" class="btn btn-outline ml-2 py-2 px-4">
      New Sale (POS)
    </a>
  </footer>
</div>

<style>
  /* Basic styles - assuming Tailwind handles most. Add print-specific styles in a @media print block if needed. */
  .invoice-container { /* Tailwind classes applied directly */ }
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; border-width: 1px; border-style: solid; cursor: pointer; }
  .btn-primary { background-color: #4F46E5; color: white; border-color: transparent; }
  .btn-primary:hover { background-color: #4338CA; }
  .btn-secondary { background-color: #6B7280; color: white; border-color: transparent; } /* Tailwind gray-600 */
  .btn-secondary:hover { background-color: #4B5563; } /* Tailwind gray-700 */
  .btn-outline { background-color: transparent; color: #4F46E5; border-color: #4F46E5; }
  .btn-outline:hover { background-color: #4F46E5; color: white; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }

  @media print {
    .print-hide { display: none; }
    .invoice-container { box-shadow: none; margin: 0; max-width: none; border: none; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Ensures background colors print */
  }
</style>
