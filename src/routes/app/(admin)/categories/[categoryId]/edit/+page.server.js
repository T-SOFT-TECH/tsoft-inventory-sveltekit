import { fail, redirect, error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, params }) => {
  const { categoryId } = params;

  // Fetch the category to be edited
  const { data: category, error: categoryError } = await locals.supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    throw error(404, `Category not found: ${categoryError?.message || 'No such category.'}`);
  }

  // Fetch potential parent categories, excluding the current category itself
  const { data: potentialParents, error: parentsError } = await locals.supabase
    .from('categories')
    .select('id, name')
    .neq('id', categoryId) // Exclude self from potential parents
    .order('name', { ascending: true });

  if (parentsError) {
    throw error(500, `Could not fetch potential parent categories: ${parentsError.message}`);
  }

  return {
    category,
    potentialParents: potentialParents ?? [],
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, locals, params }) => {
    const { categoryId } = params;
    const formData = await request.formData();

    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString();
    const parentIdFromForm = formData.get('parent_id')?.toString();
    const parent_id = parentIdFromForm && parentIdFromForm !== "" ? parentIdFromForm : null;

    // Basic validation
    if (!name) {
      return fail(400, {
        name, description, parent_id, // Return current values to prefill form
        missingName: true,
        message: 'Category name is required.',
      });
    }

    // Ensure parent_id is not the category's own id
    if (parent_id === categoryId) {
        return fail(400, {
            name, description, parent_id,
            message: 'A category cannot be its own parent.',
        });
    }

    const dataToUpdate = {
      name,
      description,
      parent_id,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await locals.supabase
      .from('categories')
      .update(dataToUpdate)
      .eq('id', categoryId);

    if (updateError) {
      console.error('Error updating category:', updateError);
      // Check for unique constraint violation on 'name'
      // Supabase/PostgREST error code for unique violation is '23505'
      if (updateError.code === '23505' && updateError.message.includes('categories_name_key')) {
        return fail(400, {
          name, description, parent_id,
          duplicateName: true,
          message: 'Another category with this name already exists.',
        });
      }
      return fail(500, {
        name, description, parent_id,
        message: `Failed to update category: ${updateError.message}`,
      });
    }

    throw redirect(303, `/app/admin/categories?message=Category '${name}' updated successfully`);
  },
};
