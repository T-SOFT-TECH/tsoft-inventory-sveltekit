import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
    event,
  });

  /**
   * a little helper that is written for convenience so that instead
   * of calling `const { data: { session } } = await event.locals.supabase.auth.getSession()`
   * you just call this `await getSession()`
   */
  event.locals.getSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    return session;
  };

  // Maintain for backwards compatibility, prefer getSession()
  const {
    data: { session },
  } = await event.locals.supabase.auth.getSession();
  event.locals.session = session;
  event.locals.user = session?.user ?? null;

  // The auth helpers package should handle cookie updates.
  // For example, if the session is refreshed, it should automatically set the new cookies.
  return resolve(event, {
    /**
     * Tell SvelteKit that supabase.auth.getSession() is important to the UI so that
     * `invalidateAll()` (or `invalidate('supabase:auth')`) will tell SvelteKit to
     * rerender the layout and call `getSession()` again if necessary
     * SvelteKit an official Supabase integration that is this: https://github.com/supabase/auth-helpers/blob/main/packages/sveltekit/src/index.ts#L137-L148
     */
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
};
