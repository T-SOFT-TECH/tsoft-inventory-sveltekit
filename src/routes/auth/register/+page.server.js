import { fail, redirect } from '@sveltejs/kit';
// No longer importing supabase from $lib/server/supabase.js for this action
// import { supabase } from '$lib/server/supabase.js';

export const actions = {
  register: async ({ request, locals }) => { // Added locals
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');
    const passwordConfirm = data.get('password_confirm');

    if (!email || !password || !passwordConfirm) {
      return fail(400, { email, message: 'All fields are required' });
    }

    if (password !== passwordConfirm) {
      return fail(400, { email, message: 'Passwords do not match' });
    }

    // Basic password strength check (example: minimum 6 characters)
    if (password.length < 6) {
      return fail(400, { email, message: 'Password must be at least 6 characters long' });
    }

    // Use locals.supabase provided by hooks.server.js
    const { data: signupData, error: signupError } = await locals.supabase.auth.signUp({ email, password });

    if (signupError) {
      return fail(400, { email, message: signupError.message });
    }

    if (!signupData.user) {
      // This case handles situations where signUp might succeed without error but doesn't return user data
      // For example, if email confirmation is required, user might not be in a "logged in" state yet.
      // However, signupData.user should still be populated with the created user's details.
      // If it's truly null, it's an unexpected state.
      console.error('User registration succeeded but no user data returned immediately after signUp.');
      // Depending on Supabase settings (e.g. email confirmation), user might not have a session yet.
      // But signupData.user should contain the user details. If not, it's an issue.
      // For now, we will attempt to proceed if signupData.user is available, even if session is null.
      // If signupData.user is null, then we must fail.
       return fail(500, { email, message: "User registration attempt completed but no user data was returned. Cannot create profile." });
    }

    const userId = signupData.user.id;
    if (!userId) {
        // Defensive check, though signupData.user existing should mean userId is present.
        return fail(500, { email, message: "User registration succeeded but no user ID found. Cannot create profile." });
    }

    const username = email.split('@')[0]; // Basic username generation

    const { error: profileError } = await locals.supabase
      .from('profiles')
      .insert({
        id: userId,
        username: username
        // full_name and avatar_url can be omitted or set to null explicitly by default in DB
      });

    if (profileError) {
      // Signup succeeded but profile creation failed.
      // This is a critical issue to log for administration.
      // A more robust solution might:
      // 1. Attempt to delete the auth.user to allow re-registration.
      // 2. Or, add the user to a queue for manual profile creation.
      // 3. Or, inform the user specifically that profile setup failed and they should contact support.
      console.error(`Critical: User ${userId} signed up successfully, but profile creation failed: ${profileError.message}`);

      // For now, we'll let the user know that part of the process failed.
      // Redirecting to login might be confusing if their profile is missing.
      // Consider a specific error page or a message indicating partial success.
      // However, the original instruction was to proceed with login redirect.
      // To avoid leaving the user in a broken state, it might be better to fail here
      // and encourage them to retry or contact support.
      // Let's return a fail() that informs them about the profile issue.
      return fail(500, {
        email,
        message: `Registration was successful, but creating your profile failed. Please contact support. (Error: ${profileError.code || profileError.message})`
      });
    }

    // If signUp and profile creation are successful:
    // Supabase typically sends a confirmation email if enabled in settings.
    // The user will need to confirm their email before they can log in.
    throw redirect(303, '/auth/login?message=Registration successful. Please check your email to confirm your account and then log in.');
  },
};
