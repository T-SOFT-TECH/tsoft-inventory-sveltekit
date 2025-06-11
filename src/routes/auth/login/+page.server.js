import { fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

export const actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (!email || !password) {
      return fail(400, { email, missing: true, message: 'Email and password are required' });
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return fail(401, { email, incorrect: true, message: error.message });
    }

    if (authData.session) {
      cookies.set('access_token', authData.session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: authData.session.expires_in // Use session's expires_in for maxAge
      });
      cookies.set('refresh_token', authData.session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // Example: 30 days for refresh token
      });
    } else {
      // This case should ideally not be reached if signInWithPassword was successful without error
      return fail(500, { email, message: 'Login failed, no session data received.' });
    }

    throw redirect(303, '/app/dashboard');
  },

  logout: async ({ cookies, locals }) => {
    // Sign out using the Supabase client from event.locals
    // This client is managed by @supabase/auth-helpers-sveltekit and should handle cookie invalidation.
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      // It's generally not recommended to expose raw error messages to the client
      // For now, we'll return a generic error, but consider logging the actual error server-side.
      return fail(500, { message: 'Logout failed. Please try again.' });
    }

    // Explicitly delete any custom cookies set during login,
    // although signOut() from auth-helpers should handle its own cookies.
    // The names 'access_token' and 'refresh_token' are based on what was set in the login action.
    cookies.delete('access_token', { path: '/' });
    cookies.delete('refresh_token', { path: '/' });

    // Supabase auth helpers might use cookies prefixed with 'sb-'
    // For example: 'sb-access-token', 'sb-refresh-token'
    // While locals.supabase.auth.signOut() should handle these,
    // you could add them here if you find they are not being cleared reliably,
    // but it's usually better to rely on the helper library.
    // cookies.delete('sb-access-token', { path: '/' }); // Example if auth-helpers uses this name
    // cookies.delete('sb-refresh-token', { path: '/' }); // Example if auth-helpers uses this name


    throw redirect(303, '/auth/login?message=Successfully logged out');
  },
};
