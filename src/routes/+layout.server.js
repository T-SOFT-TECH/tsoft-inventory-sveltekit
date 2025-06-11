/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ locals }) => {
  return {
    user: locals.user, // user is populated from hooks.server.js
    session: locals.session // session is populated from hooks.server.js
  };
};
