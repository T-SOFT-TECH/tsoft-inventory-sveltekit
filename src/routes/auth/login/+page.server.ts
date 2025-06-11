import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types'; // Import PageServerLoad if you add a load function
// import { supabase } from '$lib/server/supabase.ts'; // Not directly used if relying on locals.supabase

// If you have a common redirect for already logged-in users, you might add a load function:
// export const load: PageServerLoad = async ({ locals, url }) => {
//   if (locals.user) {
//     const redirectTo = url.searchParams.get('redirectTo') || '/app/dashboard';
//     throw redirect(303, redirectTo);
//   }
//   return {};
// };

export const actions: Actions = {
  login: async ({ cookies, request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();

    // Basic validation
    if (!email || !password) {
      return fail(400, {
        email, // Repopulate email field
        missing: true,
        message: 'Email and password are required.',
      });
    }

    const { data, error: signInError } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return fail(401, {
        email,
        incorrect: true,
        message: signInError.message,
      });
    }

    // At this point, Supabase client (if correctly configured, especially with auth-helpers)
    // should have handled setting its own session cookies.
    // Manually setting 'sb-access-token' or 'sb-refresh-token' might be redundant or conflict
    // if @supabase/auth-helpers-sveltekit is used in hooks.server.js, as it manages token storage.
    // The project description implies auth-helpers will be used.
    // If explicit cookie setting were needed (e.g. without auth-helpers or for specific reasons):
    // if (data.session) {
    //   cookies.set('sb-access-token', data.session.access_token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: data.session.expires_in });
    //   cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: data.session.expires_in * 2 }); // Example longer expiry
    // }

    // Redirect to the dashboard or intended page after login
    // TODO: Implement redirectTo functionality from URL query param if needed
    const redirectTo = new URL(request.url).searchParams.get('redirectTo');
    if (redirectTo) {
        throw redirect(303, `/${redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo}`);
    }
    throw redirect(303, '/app/dashboard');
  },

  logout: async ({ locals }) => {
    // locals.supabase client from hooks.server.js should handle cookie invalidation via auth-helpers
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      return fail(500, { message: 'Logout failed: ' + error.message });
    }

    // Redirect to login page after logout
    throw redirect(303, '/auth/login?message=Successfully logged out');
  },
};
