<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL params
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation'; // If action is successful and returns data not redirect

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state('');

  // $state variables for each form field, initialized from data.settings or form.fields
  // The `form?.fields` part is for repopulating the form if a server action fails validation
  // and returns the submitted fields.
  let company_name = $state(form?.fields?.company_name ?? data.settings.company_name ?? '');
  let company_address = $state(form?.fields?.company_address ?? data.settings.company_address ?? '');
  let company_email = $state(form?.fields?.company_email ?? data.settings.company_email ?? '');
  let company_phone = $state(form?.fields?.company_phone ?? data.settings.company_phone ?? '');
  let company_logo_url = $state(form?.fields?.company_logo_url ?? data.settings.company_logo_url ?? '');
  let default_currency_symbol = $state(form?.fields?.default_currency_symbol ?? data.settings.default_currency_symbol ?? '$');
  // Ensure numeric fields are handled correctly, potentially as numbers if Zod parses them, or strings if raw.
  // For $state bound to input type="number", string representation is fine initially.
  let default_tax_rate_percentage = $state(form?.fields?.default_tax_rate_percentage ?? data.settings.default_tax_rate_percentage ?? 0);
  let invoice_footer_text = $state(form?.fields?.invoice_footer_text ?? data.settings.invoice_footer_text ?? '');

  // This effect handles messages from both server redirects (via URL) and form action returns
  $effect(() => {
    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      displayMessage = urlMessage;
      // Optional: Clear message from URL to prevent it from sticking on refresh
      // const currentUrl = new URL($page.url);
      // if (currentUrl.searchParams.has('message')) {
      //   currentUrl.searchParams.delete('message');
      //   window.history.replaceState(null, '', currentUrl.href);
      // }
    } else if (form?.message) {
      displayMessage = form.message;
    } else {
      displayMessage = '';
    }

    // If form action was successful (and didn't redirect), update fields from returned data if any
    // This is more relevant if action returns updated data. Here, we just show message.
    if (form?.success && form.action === 'updateSettings') {
        // `invalidateAll()` could be called in enhance if action returns success instead of redirecting
    }
  });

</script>

<div class="container mx-auto p-4">
  <h1 class="text-3xl font-semibold text-gray-800 mb-8">Application Settings</h1>

  {#if displayMessage}
    <div class="mb-6 p-4 rounded-md text-sm"
         class:bg-green-100={displayMessage.toLowerCase().includes("success") || (form?.success === true)}
         class:text-green-700={displayMessage.toLowerCase().includes("success") || (form?.success === true)}
         class:bg-red-100={form?.errors || (displayMessage && !displayMessage.toLowerCase().includes("success") && form?.success === false)}
         class:text-red-700={form?.errors || (displayMessage && !displayMessage.toLowerCase().includes("success") && form?.success === false)}
         class:bg-yellow-100={!displayMessage.toLowerCase().includes("success") && form?.success === undefined && displayMessage}
         class:text-yellow-700={!displayMessage.toLowerCase().includes("success") && form?.success === undefined && displayMessage}>
      {displayMessage}
    </div>
  {/if}

  <form method="POST" action="?/updateSettings" use:enhance={() => {
    return async ({ result, update}) => {
        await update(); // Ensures $props().form is updated with action result
        if (result.type === 'success' && result.data?.action === 'updateSettings' && result.data?.success) {
            // Data is already updated in $state variables via form binding if action returned fields.
            // If action just returns success, and we want to ensure data is fresh from server:
            await invalidateAll(); // This will re-run load and update `data.settings`
        }
    }
  }} class="space-y-6 bg-white shadow-xl rounded-lg p-6 md:p-8">

    <fieldset class="space-y-4 border p-4 rounded-md">
      <legend class="text-xl font-medium text-gray-700 px-2">Company Details</legend>
      <div>
        <label for="company_name" class="label">Company Name <span class="text-red-500">*</span></label>
        <input type="text" name="company_name" id="company_name" bind:value={company_name} required class="input w-full {form?.errors?.company_name ? 'input-error' : ''}" />
        {#if form?.errors?.company_name}<p class="error-message">{form.errors.company_name[0]}</p>{/if}
      </div>
      <div>
        <label for="company_address" class="label">Company Address</label>
        <textarea name="company_address" id="company_address" rows="3" bind:value={company_address} class="input w-full {form?.errors?.company_address ? 'input-error' : ''}"></textarea>
        {#if form?.errors?.company_address}<p class="error-message">{form.errors.company_address[0]}</p>{/if}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="company_email" class="label">Company Email</label>
          <input type="email" name="company_email" id="company_email" bind:value={company_email} class="input w-full {form?.errors?.company_email ? 'input-error' : ''}" />
          {#if form?.errors?.company_email}<p class="error-message">{form.errors.company_email[0]}</p>{/if}
        </div>
        <div>
          <label for="company_phone" class="label">Company Phone</label>
          <input type="tel" name="company_phone" id="company_phone" bind:value={company_phone} class="input w-full {form?.errors?.company_phone ? 'input-error' : ''}" />
          {#if form?.errors?.company_phone}<p class="error-message">{form.errors.company_phone[0]}</p>{/if}
        </div>
      </div>
      <div>
        <label for="company_logo_url" class="label">Company Logo URL</label>
        <input type="url" name="company_logo_url" id="company_logo_url" bind:value={company_logo_url} placeholder="https://example.com/logo.png" class="input w-full {form?.errors?.company_logo_url ? 'input-error' : ''}" />
        {#if form?.errors?.company_logo_url}<p class="error-message">{form.errors.company_logo_url[0]}</p>{/if}
         {#if company_logo_url} <img src={company_logo_url} alt="Logo Preview" class="mt-2 max-h-20 rounded"/> {/if}
      </div>
    </fieldset>

    <fieldset class="space-y-4 border p-4 rounded-md">
      <legend class="text-xl font-medium text-gray-700 px-2">Financial Settings</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="default_currency_symbol" class="label">Default Currency Symbol <span class="text-red-500">*</span></label>
          <input type="text" name="default_currency_symbol" id="default_currency_symbol" bind:value={default_currency_symbol} required class="input w-full {form?.errors?.default_currency_symbol ? 'input-error' : ''}" />
          {#if form?.errors?.default_currency_symbol}<p class="error-message">{form.errors.default_currency_symbol[0]}</p>{/if}
        </div>
        <div>
          <label for="default_tax_rate_percentage" class="label">Default Tax Rate (%) <span class="text-red-500">*</span></label>
          <input type="number" name="default_tax_rate_percentage" id="default_tax_rate_percentage" bind:value={default_tax_rate_percentage} required step="0.01" min="0" max="100" class="input w-full {form?.errors?.default_tax_rate_percentage ? 'input-error' : ''}" />
          {#if form?.errors?.default_tax_rate_percentage}<p class="error-message">{form.errors.default_tax_rate_percentage[0]}</p>{/if}
        </div>
      </div>
    </fieldset>

    <fieldset class="space-y-4 border p-4 rounded-md">
      <legend class="text-xl font-medium text-gray-700 px-2">Invoice Settings</legend>
      <div>
        <label for="invoice_footer_text" class="label">Invoice Footer Text</label>
        <textarea name="invoice_footer_text" id="invoice_footer_text" rows="3" bind:value={invoice_footer_text} class="input w-full {form?.errors?.invoice_footer_text ? 'input-error' : ''}"></textarea>
        {#if form?.errors?.invoice_footer_text}<p class="error-message">{form.errors.invoice_footer_text[0]}</p>{/if}
      </div>
    </fieldset>

    <div class="flex justify-end pt-6 border-t mt-8">
      <button type="submit" class="btn btn-primary">Save Settings</button>
    </div>
  </form>
</div>

<style>
  .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;}
  .input { padding: 0.5rem 0.75rem; border-width: 1px; border-color: #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .input:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-color: #6366F1; box-shadow: 0 0 0 2px var(--tw-ring-color); border-color: #6366F1; }
  .input-error { border-color: #EF4444; }
  .error-message { font-size: 0.75rem; color: #DC2626; margin-top: 0.25rem; }
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; border-width: 1px; border-style: solid; cursor: pointer; }
  .btn-primary { background-color: #4F46E5; color: white; border-color: transparent; }
  .btn-primary:hover { background-color: #4338CA; }
  /* Tailwind placeholder classes */
  .container { max-width: 1280px; } .mx-auto { margin-left: auto; margin-right: auto; } .p-4 { padding: 1rem; } .p-6 { padding: 1.5rem; } .p-8 { padding: 2rem; }
  .mb-8 { margin-bottom: 2rem; } .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mt-8 { margin-top: 2rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; } .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
  .pt-6 { padding-top: 1.5rem; } .border-t { border-top-width: 1px; border-color: #e5e7eb;}
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; } .text-xl { font-size: 1.25rem; line-height: 1.75rem; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
  .text-gray-800 { color: #1f2937; } .text-gray-700 { color: #374151; } .text-red-500 { color: #EF4444; }
  .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); } .rounded-lg { border-radius: 0.5rem; }
  .grid { display: grid; } .md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; } .justify-end { justify-content: flex-end; }
  .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .bg-yellow-100 { background-color: #fef9c3; } .text-yellow-700 { color: #a16207; }
  fieldset { border-width: 1px; border-color: #D1D5DB; padding: 1rem; border-radius: 0.375rem; }
  legend { padding: 0 0.5rem; font-weight: 500; font-size: 1.125rem; /* text-lg */ }
  .max-h-20 { max-height: 5rem; } .rounded { border-radius: 0.25rem; }
</style>
