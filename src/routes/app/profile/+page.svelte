<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores'; // Svelte 4/5 compatible for URL params
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation'; // If actions return success without redirect

  // data.user comes from /app/+layout.server.ts and includes data.user.profile from hooks.server.ts
  // data.profile comes from this page's own load function (src/routes/app/profile/+page.server.ts)
  // We can choose which one to use. Using data.user.profile as it's more direct from the hook.
  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state(''); // For general messages from actions or URL
  let profileUpdateMessage = $state(''); // Specific for profile update form
  let passwordChangeMessage = $state(''); // Specific for password change form

  // User object from the parent layout's load function (includes profile from hook)
  let user = $derived(data.user);
  // Profile data can also be taken directly from data.profile if preferred from this page's load
  let profile = $derived(user?.profile ?? data.profile);

  // Form fields for Profile Update, bound to $state
  // Initialize with profile data, fallback to form data if an action failed, then to empty
  let username = $state(form?.action === 'updateProfile' && form.fields?.username !== undefined ? String(form.fields.username) : (profile?.username ?? ''));
  let fullName = $state(form?.action === 'updateProfile' && form.fields?.full_name !== undefined ? String(form.fields.full_name) : (profile?.full_name ?? ''));
  // avatarUrl (text input) is being replaced by avatarFile (file input)
  // let avatarUrl_textInput = $state(form?.action === 'updateProfile' && form.fields?.avatar_url !== undefined ? String(form.fields.avatar_url) : (profile?.avatar_url ?? ''));

  let avatarFile = $state<File | null>(null);
  // Initialize preview URL with existing avatar from profile, or null if none
  let avatarPreviewUrl = $state<string | null>(user?.profile?.avatar_url ?? data.profile?.avatar_url ?? null);


  // Form fields for Password Change
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmNewPassword = $state('');

  $effect(() => {
    const urlMessage = new URL($page.url).searchParams.get('message');
    if (urlMessage) {
      displayMessage = urlMessage;
    } else {
      // Prioritize form-specific messages if no URL message
      if (form?.action === 'updateProfile' && form.message) {
        profileUpdateMessage = form.message;
        passwordChangeMessage = ''; // Clear other form message
      } else if (form?.action === 'changePassword' && form.message) {
        passwordChangeMessage = form.message;
        profileUpdateMessage = ''; // Clear other form message
      } else if (form?.message) { // General message from unknown action or if not specific
        displayMessage = form.message;
      }
    }

    // Clear form-specific messages if form indicates success (and didn't redirect)
    // This effect also handles clearing password fields on successful password change.
    if (form?.action === 'updateProfile') {
        if (form.success) {
            profileUpdateMessage = form.message || 'Profile updated successfully!';
            avatarFile = null; // Already handled in use:enhance, but good for safety
        } else if (form.message) { // Error message for profile update
            profileUpdateMessage = form.message;
        }
    }
    if (form?.action === 'changePassword') {
        if (form.success) {
            passwordChangeMessage = form.message || 'Password changed successfully!';
            // Clearing fields is now primarily handled in use:enhance for immediate feedback
            // currentPassword = ''; newPassword = ''; confirmNewPassword = '';
        } else if (form.message) { // Error message for password change
            passwordChangeMessage = form.message;
        }
    }
  });

// Effect to manage object URL for avatar preview
$effect(() => {
  let currentPreview = avatarPreviewUrl; // Capture current value
  const isObjectUrl = currentPreview?.startsWith('blob:');

  return () => {
    // Cleanup function: revoke object URL if it was one
    if (isObjectUrl) {
      URL.revokeObjectURL(currentPreview!); // Add non-null assertion if sure it's a string
    }
  };
});

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    avatarFile = file; // Store the file object in $state

    // Clean up old preview object URL if it exists and was a blob
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    avatarPreviewUrl = URL.createObjectURL(file); // Create new preview URL
  } else {
    // No file selected or selection cleared
    avatarFile = null;
    // If there was a blob URL, revoke it
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    // Revert preview to the original avatar URL from the database
    avatarPreviewUrl = user?.profile?.avatar_url ?? data.profile?.avatar_url ?? null;
  }
}

</script>

<div class="container mx-auto p-4 space-y-8">
  <h1 class="text-3xl font-semibold text-gray-800">User Profile</h1>

  {#if displayMessage && !profileUpdateMessage && !passwordChangeMessage}
    <div class="p-3 rounded text-sm"
         class:bg-green-100={displayMessage.toLowerCase().includes("success")}
         class:text-green-700={displayMessage.toLowerCase().includes("success")}
         class:bg-yellow-100={!displayMessage.toLowerCase().includes("success")}>
      {displayMessage}
    </div>
  {/if}

  <!-- Profile Update Form -->
  <section class="bg-white shadow-xl rounded-lg p-6 md:p-8">
    <h2 class="text-2xl font-semibold text-gray-700 mb-6">Update Profile Information</h2>
    {#if profileUpdateMessage}
      <div class="mb-4 p-3 rounded text-sm {form?.errors || (form?.message && !form.message.toLowerCase().includes('success')) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
        {profileUpdateMessage}
      </div>
    {/if}
    <form method="POST" action="?/updateProfile" use:enhance={({ form: currentFormEl, data: formData, action, cancel }) => {
      // This enhance function could be used for optimistic UI or more complex client-side logic
      // For now, primarily focusing on invalidateAll after success.
      return async ({ result, update }) => {
        // The `form` prop accessible in the component script ($props) will be updated automatically
        // by SvelteKit when the action returns, especially on `fail`.
        // `update()` can be called to ensure this happens before further client logic if needed.
        await update(); // Ensures `form` prop is updated based on `result` before proceeding

        if (result.type === 'success' && result.data?.action === 'updateProfile' && result.data?.success) {
          // Message is set by the $effect watching `form`.
          // Clear the file input state on successful upload.
          avatarFile = null;
          // Re-fetch all data, including profile data in layouts via hooks
          await invalidateAll();
        } else if (result.type === 'failure' || result.type === 'error') {
          // Error messages are handled by the $effect watching `form`
          // or by specific error displays tied to `form.errors`.
          // profileUpdateMessage will be set by the $effect.
        }
      };
    }} class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700">Email (cannot be changed)</label>
        <p class="mt-1 text-base text-gray-500 bg-gray-100 p-2 rounded-md">{user?.email ?? 'N/A'}</p>
      </div>
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
        <input type="text" name="username" id="username" bind:value={username} class="input mt-1 block w-full {form?.action==='updateProfile' && form.errors?.username ? 'input-error' : ''}" />
        {#if form?.action==='updateProfile' && form.errors?.username}<p class="mt-1 text-xs text-red-600">{form.errors.username[0]}</p>{/if}
      </div>
      <div>
        <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
        <input type="text" name="full_name" id="full_name" bind:value={fullName} class="input mt-1 block w-full {form?.action==='updateProfile' && form.errors?.full_name ? 'input-error' : ''}" />
        {#if form?.action==='updateProfile' && form.errors?.full_name}<p class="mt-1 text-xs text-red-600">{form.errors.full_name[0]}</p>{/if}
      </div>

      <div>
        <label for="avatar_file" class="block text-sm font-medium text-gray-700">Avatar Image</label>
        <input
            type="file"
            name="avatar_file"
            id="avatar_file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onchange={handleFileSelect}
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 {form?.action==='updateProfile' && form.errors?.avatar_file ? 'border-red-500' : ''}"
        />
        {#if form?.action==='updateProfile' && form.errors?.avatar_file }
            <p class="text-red-500 text-xs italic mt-1">{form.errors.avatar_file[0]}</p>
        {/if}
      </div>

      <div class="mt-2">
        <p class="text-sm font-medium text-gray-700">Avatar Preview:</p>
        {#if avatarPreviewUrl}
          <img src={avatarPreviewUrl} alt="Avatar preview" class="mt-2 w-24 h-24 rounded-full object-cover shadow-md" />
        {:else}
          <div class="mt-2 w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
             {(profile?.username || user?.email || 'U').substring(0, 1).toUpperCase()}
          </div>
        {/if}
      </div>
      <div class="pt-4">
        <button type="submit" class="btn btn-primary">Update Profile</button>
      </div>
    </form>
  </section>

  <!-- Change Password Form (Optional, as per prompt) -->
  <section class="bg-white shadow-xl rounded-lg p-6 md:p-8">
    <h2 class="text-2xl font-semibold text-gray-700 mb-6">Change Password</h2>
     {#if passwordChangeMessage}
      <div class="mb-4 p-3 rounded text-sm {form?.errors || (form?.message && !form.message.toLowerCase().includes('success')) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
        {passwordChangeMessage}
      </div>
    {/if}
    <form method="POST" action="?/changePassword" use:enhance={() => {
      return async ({ result, update }) => {
        await update(); // Update $props().form first

        // Always clear password fields after an attempt for security
        currentPassword = '';
        newPassword = '';
        confirmNewPassword = '';

        // Messages (success or error) are handled by the $effect watching `form`
        if (result.type === 'success' && result.data?.action === 'changePassword' && result.data?.success) {
          // Optionally, specific client-side actions on successful password change
          // e.g., if NOT redirecting and need to manually show extended success state.
          // Message is already set by $effect based on form prop.
        } else if (result.type === 'failure' || result.type === 'error') {
          // Specific client-side error handling if needed beyond $effect.
          // For instance, focusing on the first error field.
          // Error messages are set by $effect based on form prop.
        }
      };
    }} class="space-y-6">
      <div>
        <label for="current_password" class="block text-sm font-medium text-gray-700">Current Password</label>
        <input type="password" name="current_password" id="current_password" bind:value={currentPassword} required class="input mt-1 block w-full {form?.action==='changePassword' && form.errors?.current_password ? 'input-error' : ''}" />
        {#if form?.action==='changePassword' && form.errors?.current_password}<p class="mt-1 text-xs text-red-600">{form.errors.current_password[0]}</p>{/if}
      </div>
      <div>
        <label for="new_password" class="block text-sm font-medium text-gray-700">New Password</label>
        <input type="password" name="new_password" id="new_password" bind:value={newPassword} required class="input mt-1 block w-full {form?.action==='changePassword' && form.errors?.new_password ? 'input-error' : ''}" />
        {#if form?.action==='changePassword' && form.errors?.new_password}<p class="mt-1 text-xs text-red-600">{form.errors.new_password[0]}</p>{/if}
      </div>
      <div>
        <label for="confirm_new_password" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
        <input type="password" name="confirm_new_password" id="confirm_new_password" bind:value={confirmNewPassword} required class="input mt-1 block w-full {form?.action==='changePassword' && form.errors?.confirm_new_password ? 'input-error' : ''}" />
        {#if form?.action==='changePassword' && form.errors?.confirm_new_password}<p class="mt-1 text-xs text-red-600">{form.errors.confirm_new_password[0]}</p>{/if}
      </div>
      <div class="pt-4">
        <button type="submit" class="btn btn-primary">Change Password</button>
      </div>
    </form>
  </section>
</div>

<style>
  .input { padding: 0.5rem 0.75rem; border-width: 1px; border-color: #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .input:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-color: #6366F1; box-shadow: 0 0 0 2px var(--tw-ring-color); border-color: #6366F1; }
  .input-error { border-color: #EF4444; }
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; border-width: 1px; border-style: solid; cursor: pointer; }
  .btn-primary { background-color: #4F46E5; color: white; border-color: transparent; }
  .btn-primary:hover { background-color: #4338CA; }
  /* Tailwind placeholder classes */
  .container { max-width: 1280px; } .mx-auto { margin-left: auto; margin-right: auto; } .p-4 { padding: 1rem; } .p-6 { padding: 1.5rem; } .p-8 { padding: 2rem; }
  .mb-6 { margin-bottom: 1.5rem; } .mb-4 { margin-bottom: 1rem; }
  .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 2rem; }
  .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
  .pt-4 { padding-top: 1rem; }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; } .text-2xl { font-size: 1.5rem; line-height: 2rem; } .text-base { font-size: 1rem; line-height: 1.5rem; } .text-sm { font-size: 0.875rem; line-height: 1.25rem; } .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
  .text-gray-800 { color: #1f2937; } .text-gray-700 { color: #374151; } .text-gray-500 { color: #6b7280; } .text-red-600 { color: #dc2626; }
  .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .block { display: block; } .w-full { width: 100%; }
  .bg-white { background-color: #ffffff; } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); } .rounded-lg { border-radius: 0.5rem; }
  .w-20 { width: 5rem; } .h-20 { height: 5rem; } .w-24 { width: 6rem; } .h-24 { height: 6rem; }
  .rounded-full { border-radius: 9999px; } .object-cover { object-fit: cover; } .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .bg-gray-100 { background-color: #f3f4f6; } .bg-gray-200 { background-color: #e5e7eb; } .bg-gray-300 { background-color: #d1d5db; }
  .flex { display: flex; } .items-center { align-items: center; } .justify-center { justify-content: center; }
  .bg-red-100 { background-color: #fee2e2; } .text-red-700 { color: #b91c1c; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .bg-yellow-100 { background-color: #fef9c3; } .text-yellow-700 { color: #a16207; }
</style>
