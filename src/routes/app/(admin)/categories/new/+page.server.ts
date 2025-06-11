import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: potentialParents, error: dbError } = await locals.supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching potential parent categories:', dbError);
    throw error(500, { message: 'Could not fetch categories for parent selection: ' + dbError.message });
  }

  return {
    potentialParents: potentialParents ?? [],
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString()?.trim();
    const description = formData.get('description')?.toString()?.trim();
    const parentIdFromForm = formData.get('parent_id')?.toString();
    const parent_id = parentIdFromForm && parentIdFromForm !== "" ? parentIdFromForm : null;

    const returnData = {
        name,
        description,
        parent_id,
        message: '',
        missingName: false,
        duplicateName: false,
    };

    if (!name) {
      returnData.missingName = true;
      returnData.message = 'Category name is required.';
      return fail(400, returnData);
    }

    const dataToInsert = {
      name,
      description: description || null, // Ensure empty string becomes null
      parent_id,
    };

    const { error: insertError } = await locals.supabase
      .from('categories')
      .insert(dataToInsert)
      .select();

    if (insertError) {
      console.error('Error creating category:', insertError);
      if (insertError.code === '23505' && insertError.message.includes('categories_name_key')) { // Adjust constraint name if different
        returnData.duplicateName = true;
        returnData.message = 'A category with this name already exists.';
        return fail(400, returnData);
      }
      returnData.message = `Failed to create category: ${insertError.message}`;
      return fail(500, returnData);
    }

    throw redirect(303, '/app/admin/categories?message=Category created successfully');
  },
};
