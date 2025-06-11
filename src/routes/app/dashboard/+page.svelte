<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // User should always be present here due to /app/+layout.server.ts guard
  // So, data.user can be assumed to exist.
  // let user = $derived(data.user);
</script>

<div class="dashboard-container">
  <h1 class="text-3xl font-semibold mb-6">Dashboard</h1>

  {#if data.user}
    <p class="text-lg mb-4">
      Hello, <span class="font-medium">{data.user.email}</span>! This is your protected dashboard.
    </p>

    <div class="info-card bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-3">User Information</h2>
      <ul class="list-disc list-inside space-y-1">
        <li>User ID: <span class="font-mono text-sm bg-gray-100 px-1 rounded">{data.user.id}</span></li>
        <li>Email Verified: <span class:text-green-600={data.user.email_confirmed_at} class:text-red-600={!data.user.email_confirmed_at}>
            {data.user.email_confirmed_at ? `Yes, at ${new Date(data.user.email_confirmed_at).toLocaleString()}` : 'No'}
          </span>
        </li>
        <li>Account Created: {new Date(data.user.created_at).toLocaleDateString()}</li>
        <!-- Add more relevant user or app information here -->
      </ul>
    </div>

    <p class="mt-6 text-gray-600">
      From here, you can manage your profile, view application data, or access other features.
    </p>
  {:else}
    <!-- This should ideally not be reached if the layout server file is correctly guarding the route -->
    <p class="text-red-500">Error: User data not available. Please try logging in again.</p>
  {/if}
</div>

<style>
  /* Basic styling, assuming Tailwind or global styles provide utilities */
  .dashboard-container {
    /* max-width: 800px; remove if full width desired */
    /* margin: 0 auto; */
  }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .font-semibold { font-weight: 600; }
  .mb-6 { margin-bottom: 1.5rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .mb-4 { margin-bottom: 1rem; }
  .font-medium { font-weight: 500; }
  .info-card { /* Handled by Tailwind-like classes */ }
  .bg-white { background-color: #ffffff; }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
  .rounded-lg { border-radius: 0.5rem; }
  .p-6 { padding: 1.5rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .mb-3 { margin-bottom: 0.75rem; }
  .list-disc { list-style-type: disc; }
  .list-inside { list-style-position: inside; }
  .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .bg-gray-100 { background-color: #f3f4f6; }
  .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
  .rounded { border-radius: 0.25rem; }
  .text-green-600 { color: #059669; }
  .text-red-600 { color: #DC2626; }
  .mt-6 { margin-top: 1.5rem; }
  .text-gray-600 { color: #4B5563; }
  .text-red-500 { color: #EF4444; }
</style>
