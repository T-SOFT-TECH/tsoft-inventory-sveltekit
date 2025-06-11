import { redirect, error } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // First, ensure the user is logged in. This is also handled by /app/+layout.server.ts
  // but it's good practice for defense in depth, or if this layout could be accessed differently.
  if (!locals.user) {
    const redirectTo = `${url.pathname}${url.search}`;
    throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Check if the logged-in user's email matches the ADMIN_EMAIL from environment variables.
  if (locals.user.email !== ADMIN_EMAIL) {
    // If the emails do not match, the user is not authorized to access this section.
    // Throw a 403 Forbidden error.
    // The `error` helper in SvelteKit will render the nearest +error.svelte page.
    throw error(403, { message: 'Forbidden: You do not have admin access.' });
  }

  // If the user is authenticated and their email matches ADMIN_EMAIL, they are authorized.
  // Return the user object (already shaped by App.Locals).
  return {
    user: locals.user,
    // No need to return session explicitly if user object contains all needed info for this layout level
  };
};
