import { fail, redirect, error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  // Admin access is verified by the /app/(admin)/+layout.server.js

  const { data: potentialParents, error: dbError } = await locals.supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching potential parent categories:', dbError);
    throw error(500, 'Could not fetch categories for parent selection: ' + dbError.message);
  }

  return {
    potentialParents: potentialParents ?? [],
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString();
    // Ensure parent_id is correctly handled if empty string (for "None" option)
    const parentIdFromForm = formData.get('parent_id')?.toString();
    const parent_id = parentIdFromForm && parentIdFromForm !== "" ? parentIdFromForm : null;

    if (!name) {
      return fail(400, {
        name,
        description,
        parent_id,
        missingName: true,
        message: 'Category name is required.',
      });
    }

    const dataToInsert = {
      name,
      description,
      parent_id,
      // user_id: locals.user.id // If you want to associate category with the user who created it
    };

    const { error: insertError } = await locals.supabase
      .from('categories')
      .insert(dataToInsert)
      .select(); // .select() can be useful if you want the inserted data back

    if (insertError) {
      console.error('Error creating category:', insertError);
      return fail(500, {
        name,
        description,
        parent_id,
        message: `Failed to create category: ${insertError.message}. Code: ${insertError.code}`,
      });
    }

    // On successful creation, redirect to the main categories list page
    throw redirect(303, '/app/admin/categories?message=Category created successfully');
  },
};
