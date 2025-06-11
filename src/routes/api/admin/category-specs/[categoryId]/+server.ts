import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
  const categoryId = params.categoryId;

  if (!categoryId) {
    throw error(400, 'Category ID is required');
  }

  // Ensure user is authenticated and potentially an admin if this API is sensitive
  // This might be handled by a hook or a higher-level layout check for /api/admin routes.
  // For now, assuming the page calling this is already admin-protected.
  if (!locals.user) {
    throw error(401, 'Unauthorized: You must be logged in to access this resource.');
  }
  // Add admin check if necessary, e.g. if ADMIN_EMAIL is available via locals or env
  // if (locals.user.email !== ADMIN_EMAIL) { // Assuming ADMIN_EMAIL is accessible
  //   throw error(403, 'Forbidden: You do not have admin rights.');
  // }


  const { data: specFields, error: dbError } = await locals.supabase
    .from('category_specification_fields')
    .select('*') // Select all fields, including 'options' for select type
    .eq('category_id', categoryId)
    .order('display_order', { ascending: true })
    .order('field_label', { ascending: true });

  if (dbError) {
    console.error(`Error fetching spec fields for category ${categoryId}:`, dbError);
    throw error(500, `Error fetching specification fields: ${dbError.message}`);
  }

  // The 'options' field in category_specification_fields is stored as JSONB array,
  // but Supabase client returns it as a parsed JS array directly.
  // If it were a JSON string, we'd parse it here.
  // For this task, we assume it's already a JS array from the client.

  return json(specFields ?? []);
};
