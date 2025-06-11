<script lang="ts">
  import type { ActionData } from './$types'; // No PageData as no load function
  import { enhance } from '$app/forms';

  let { form }: { form?: ActionData } = $props();

  // $state variables for form fields, initialized from form?.fields or empty strings
  let name = $state(form?.fields?.name ?? '');
  let email = $state(form?.fields?.email ?? '');
  let phone = $state(form?.fields?.phone ?? '');
  let address_line1 = $state(form?.fields?.address_line1 ?? '');
  let address_line2 = $state(form?.fields?.address_line2 ?? '');
  let city = $state(form?.fields?.city ?? '');
  let postal_code = $state(form?.fields?.postal_code ?? '');
  let country = $state(form?.fields?.country ?? '');

  // $derived for specific field errors and general display message
  let nameError = $derived(form?.errors?.name?.[0] ?? '');
  let emailError = $derived(form?.errors?.email?.[0] ?? '');
  // Add more derived errors for other fields if needed, or rely on a general message

  let displayMessage = $derived(form?.message ?? form?.errors?._general?.[0] ?? '');

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-semibold mb-6">Create New Customer</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm {form?.errors ? 'bg-red-100 text-red-700' : (form?.message?.toLowerCase().includes('success') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}">
      {displayMessage}
    </div>
  {/if}

  <form method="POST" class="space-y-6 bg-white shadow-xl rounded-lg p-8" use:enhance>
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Full Name <span class="text-red-500">*</span></label>
      <input type="text" name="name" id="name" bind:value={name} required
             class="input mt-1 block w-full {nameError ? 'input-error' : ''}" />
      {#if nameError}<p class="mt-1 text-xs text-red-600">{nameError}</p>{/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
        <input type="email" name="email" id="email" bind:value={email}
               class="input mt-1 block w-full {emailError ? 'input-error' : ''}" />
        {#if emailError}<p class="mt-1 text-xs text-red-600">{emailError}</p>{/if}
      </div>
      <div>
        <label for="phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
        <input type="tel" name="phone" id="phone" bind:value={phone}
               class="input mt-1 block w-full" />
        <!-- Add error display for phone if specific validation added in Zod -->
      </div>
    </div>

    <div>
      <label for="address_line1" class="block text-sm font-medium text-gray-700">Address Line 1</label>
      <input type="text" name="address_line1" id="address_line1" bind:value={address_line1}
             class="input mt-1 block w-full" />
    </div>
    <div>
      <label for="address_line2" class="block text-sm font-medium text-gray-700">Address Line 2</label>
      <input type="text" name="address_line2" id="address_line2" bind:value={address_line2}
             class="input mt-1 block w-full" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label for="city" class="block text-sm font-medium text-gray-700">City</label>
        <input type="text" name="city" id="city" bind:value={city}
               class="input mt-1 block w-full" />
      </div>
      <div>
        <label for="postal_code" class="block text-sm font-medium text-gray-700">Postal Code</label>
        <input type="text" name="postal_code" id="postal_code" bind:value={postal_code}
               class="input mt-1 block w-full" />
      </div>
      <div>
        <label for="country" class="block text-sm font-medium text-gray-700">Country</label>
        <input type="text" name="country" id="country" bind:value={country}
               class="input mt-1 block w-full" />
      </div>
    </div>

    <div class="flex items-center justify-end space-x-4 pt-6 border-t mt-8">
      <a href="/app/customers" role="button" class="btn btn-secondary">Cancel</a>
      <button type="submit" class="btn btn-primary">Create Customer</button>
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
  .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mt-8 { margin-top: 2rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-6 { padding-top: 1.5rem; } .border-t { border-top-width: 1px; border-color: #e5e7eb;}
  .text-2xl { font-size: 1.5rem; } .text-sm { font-size: 0.875rem; } .text-xs { font-size: 0.75rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
  .text-gray-700 { color: #374151; } .text-red-500 { color: #EF4444; } .text-red-600 { color: #DC2626; }
  .mt-1 { margin-top: 0.25rem; } .block { display: block; } .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); } .rounded-lg { border-radius: 0.5rem; }
  .grid { display: grid; } .md\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .md\:grid-cols-3 { @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; } .items-center { align-items: center; } .justify-end { justify-content: flex-end; } .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
  .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .bg-yellow-100 { background-color: #fef9c3; } .text-yellow-700 { color: #a16207; }
</style>
