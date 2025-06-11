import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import type { Handle } from '@sveltejs/kit';
// Import your Database type if you have generated it with `supabase gen types typescript`
// import type { Database } from '$lib/database.types';

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize the Supabase client on the server for each request
  // The `event` object, which includes `cookies`, is passed to the helper
  event.locals.supabase = createSupabaseServerClient({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
    event, // Pass the full event object
    // options: { global: { headers: { 'X-Client-Info': 'my-app/0.0.1' } } } // Optional: for custom client info
  });

  /**
   * A convenience helper so we can just call await getSession() instead of
   * await event.locals.supabase.auth.getSession()
   * Note: This function is attached to `event.locals` and is available in all `load` functions and `actions`.
   */
  event.locals.getSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    return session;
  };

  // Retrieve the session information.
  // This call is important as it ensures the session state is loaded from cookies
  // and made available in `event.locals.session` and `event.locals.user`.
  const {
    data: { session },
  } = await event.locals.supabase.auth.getSession();

  event.locals.session = session;
  event.locals.user = session?.user ?? null; // `user` is now of the extended User type from app.d.ts

  // If user is authenticated, fetch their profile information
  if (event.locals.user) {
    const { data: profile, error: profileError } = await event.locals.supabase
      .from('profiles')
      .select('username, full_name, avatar_url') // Select specific fields defined in Profile interface
      .eq('id', event.locals.user.id)
      .single();

    if (profileError) {
      // Log the error but don't fail the request.
      // The user can still operate without these extra profile details.
      // A missing profile might be normal for new users if profile creation is a separate step.
      console.error(`Error fetching profile for user ${event.locals.user.id}: ${profileError.message}`);
      // Ensure event.locals.user.profile is explicitly null if not found or error
      event.locals.user.profile = null;
    } else {
      // Attach the fetched profile to the user object in event.locals.
      // The 'as any' might be needed if TypeScript compiler struggles with adding
      // a new property to an imported type directly, though our extended User type should handle this.
      // event.locals.user = { ...event.locals.user, profile: profile ?? null };
      // More directly, if App.User is correctly augmented:
      event.locals.user.profile = profile ?? null;
    }
  }

  // Resolve the request, applying Supabase-specific response header filtering.
  // This is crucial for the auth helpers to manage session cookies correctly,
  // especially when the session is refreshed or tokens are updated.
  const response = await resolve(event, {
    /**
     * Supabase auth helpers recommend filtering serialized response headers.
     * This ensures that only necessary headers are passed from the server to the client,
     * preventing issues with large header sizes or exposing sensitive information.
     * 'content-range' is typically needed for Supabase Storage operations.
     * 'x-supabase-api-version' might be used by the client for API versioning.
     */
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });

  return response;
};
