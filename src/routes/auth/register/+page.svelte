<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let emailValue = $derived(form?.email ?? '');
  // Passwords are not typically repopulated for security reasons
</script>

<div class="container mx-auto p-4 max-w-md">
  <h1 class="text-2xl font-semibold mb-6 text-center">Create an Account</h1>

  {#if form?.message && !form?.errors}
    <!-- General message display -->
    <div class="mb-4 p-3 rounded text-white"
         class:bg-red-500={form.message.toLowerCase().includes("fail") || form.message.toLowerCase().includes("error")}
         class:bg-green-500={form.message.toLowerCase().includes("success")}>
      {form.message}
    </div>
  {/if}

  <form method="POST" action="?/register" class="space-y-6 bg-white shadow-xl rounded-lg p-8">
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
      <input type="email" name="email" id="email" bind:value={emailValue} required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.errors?.email ? 'border-red-500' : ''}" />
      {#if form?.errors?.email}
        <p class="mt-2 text-sm text-red-600">{form.errors.email}</p>
      {/if}
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
      <input type="password" name="password" id="password" required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.errors?.password ? 'border-red-500' : ''}" />
      {#if form?.errors?.password}
        <p class="mt-2 text-sm text-red-600">{form.errors.password}</p>
      {/if}
    </div>

    <div>
      <label for="password_confirm" class="block text-sm font-medium text-gray-700">Confirm Password</label>
      <input type="password" name="password_confirm" id="password_confirm" required
             class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {form?.errors?.password_confirm ? 'border-red-500' : ''}" />
      {#if form?.errors?.password_confirm}
        <p class="mt-2 text-sm text-red-600">{form.errors.password_confirm}</p>
      {/if}
    </div>

    {#if form?.message && form?.errors} <!-- General message if specific field errors are also present -->
      <p class="text-sm text-red-600">{form.message}</p>
    {/if}

    <div>
      <button type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Register
      </button>
    </div>

    <div class="text-sm text-center">
      <p>Already have an account? <a href="/auth/login" class="font-medium text-indigo-600 hover:text-indigo-500">Log in here</a></p>
    </div>
  </form>
</div>

<!-- Assuming styles are similar to login page and potentially shared or moved to app.css -->
<style>
  .container { max-width: 42rem; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .p-4 { padding: 1rem; }
  .p-8 { padding: 2rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .text-center { text-align: center; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .bg-white { background-color: #ffffff; }
  .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
  .rounded-lg { border-radius: 0.5rem; }
  .block { display: block; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .font-medium { font-weight: 500; }
  .text-gray-700 { color: #374151; }
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
  .text-red-600 { color: #DC2626; }
  .text-white { color: #ffffff; }
  .bg-indigo-600 { background-color: #4F46E5; }
  .hover\:bg-indigo-700:hover { background-color: #4338CA; }
  .focus\:ring-2:focus {}
  .focus\:ring-offset-2:focus {}
  .bg-red-500 { background-color: #EF4444; }
  .bg-green-500 { background-color: #22C55E; }
  .text-indigo-600 { color: #4F46E5; }
  .hover\:text-indigo-500:hover { color: #6366F1; }
</style>
