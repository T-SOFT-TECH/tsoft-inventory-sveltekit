import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { ADMIN_EMAIL } from '$env/static/private'; // Import ADMIN_EMAIL

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    // If no user is found (meaning not logged in),
    // redirect to the login page.
    // Include the current path and search parameters as redirectTo query parameter
    // so the user can be sent back to their original destination after login.
    const redirectTo = `${url.pathname}${url.search}`;
    throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // If a user is found, make the user object available to this layout and its children.
  // The user object is populated in hooks.server.js
  const isAdmin = locals.user?.email === ADMIN_EMAIL;

  return {
    user: locals.user,
    isAdmin, // Pass isAdmin status to the layout
    session: locals.session, // Optionally pass the whole session if needed for other app parts
  };
};
