import { redirect, error } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ locals, url }) => {
  // First, ensure the user is logged in.
  // This might be slightly redundant if /app/+layout.server.js already does this,
  // but it's good for explicitness and security in depth.
  if (!locals.user) {
    throw redirect(303, `/auth/login?redirectTo=${url.pathname}`);
  }

  // Check if the logged-in user's email matches the ADMIN_EMAIL from environment variables.
  if (locals.user.email !== ADMIN_EMAIL) {
    // If the emails do not match, the user is not authorized to access this section.
    // Throw a 403 Forbidden error.
    throw error(403, 'Forbidden: You do not have admin access.');
  }

  // If the user is authenticated and their email matches ADMIN_EMAIL,
  // they are authorized. Return the user object.
  return {
    user: locals.user, // or session: locals.session for the full session object
  };
};
