import { redirect } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ locals, url }) => {
  if (!locals.user) {
    // If no user is found (meaning not logged in),
    // redirect to the login page.
    // Include the current path as redirectTo query parameter
    // so the user can be sent back to their original destination after login.
    throw redirect(303, `/auth/login?redirectTo=${url.pathname}`);
  }

  // If a user is found, make the user object available to this layout and its children.
  // The user object is populated in hooks.server.js
  const isAdmin = locals.user?.email === ADMIN_EMAIL;

  return {
    user: locals.user,
    isAdmin, // Add isAdmin to the returned data
    // session: locals.session // Optionally pass the whole session if needed
  };
};
