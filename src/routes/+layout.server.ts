import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.user and locals.session are populated by the hooks.server.ts
  return {
    user: locals.user,
    session: locals.session, // Pass the session object as well, could be useful
  };
};
