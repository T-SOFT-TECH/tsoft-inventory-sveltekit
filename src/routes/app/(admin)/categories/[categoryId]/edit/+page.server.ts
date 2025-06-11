import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // RouteParams is implicitly available via params

export const load: PageServerLoad = async ({ locals, params }) => {
  const { categoryId } = params;

  const { data: category, error: categoryError } = await locals.supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    throw error(404, { message: `Category not found: ${categoryError?.message || 'No such category.'}` });
  }

  const { data: potentialParents, error: parentsError } = await locals.supabase
    .from('categories')
    .select('id, name')
    .neq('id', categoryId) // Exclude self
    .order('name', { ascending: true });

  if (parentsError) {
    throw error(500, { message: `Could not fetch potential parent categories: ${parentsError.message}` });
  }

  return {
    category,
    potentialParents: potentialParents ?? [],
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const { categoryId } = params;
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const description = formData.get('description')?.toString()?.trim();
    const parentIdFromForm = formData.get('parent_id')?.toString();
    const parent_id = parentIdFromForm && parentIdFromForm !== "" ? parentIdFromForm : null;

    // For returning values to the form
    const returnData = {
        id: categoryId, // Important for form context if needed, though usually not directly in form fields
        name,
        description,
        parent_id,
        message: '',
        missingName: false,
        duplicateName: false,
        selfParentError: false,
    };

    if (!name) {
      returnData.missingName = true;
      returnData.message = 'Category name is required.';
      return fail(400, returnData);
    }

    if (parent_id === categoryId) {
      returnData.selfParentError = true;
      returnData.message = 'A category cannot be its own parent.';
      return fail(400, returnData);
    }

    const dataToUpdate = {
      name,
      description: description || null,
      parent_id,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await locals.supabase
      .from('categories')
      .update(dataToUpdate)
      .eq('id', categoryId);

    if (updateError) {
      console.error('Error updating category:', updateError);
      if (updateError.code === '23505' && updateError.message.includes('categories_name_key')) { // Adjust constraint name
        returnData.duplicateName = true;
        returnData.message = 'Another category with this name already exists.';
        return fail(400, returnData);
      }
      returnData.message = `Failed to update category: ${updateError.message}`;
      return fail(500, returnData);
    }

    throw redirect(303, `/app/admin/categories?message=Category '${name}' updated successfully`);
  },
};
