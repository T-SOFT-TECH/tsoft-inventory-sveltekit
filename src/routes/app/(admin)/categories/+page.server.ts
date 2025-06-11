import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: categories, error: dbError } = await locals.supabase
    .from('categories')
    .select('*, parent:categories(name)') // Example of fetching parent name
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching categories:', dbError);
    throw error(500, { message: `Could not fetch categories: ${dbError.message}` });
  }

  return {
    categories: categories?.map(c => ({ ...c, parent_name: c.parent?.name ?? null })) ?? [],
  };
};

export const actions: Actions = {
  delete: async ({ url, locals }) => {
    const categoryId = url.searchParams.get('id');
    if (!categoryId) {
      return fail(400, { message: 'Category ID not provided for deletion.' });
    }

    // Check for child categories
    const { count: childCount, error: childError } = await locals.supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoryId);

    if (childError) {
      return fail(500, { message: `Error checking for child categories: ${childError.message}` });
    }
    if (childCount && childCount > 0) {
      return fail(400, { message: `Cannot delete category: It has ${childCount} child categories. Please reassign or delete them first.` });
    }

    // Check for product associations
    const { count: productCount, error: productError } = await locals.supabase
      .from('products') // Assuming a 'products' table
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId); // Assuming 'category_id' FK in products

    if (productError) {
      // If 'products' table or 'category_id' column doesn't exist, this might error.
      // For robust handling, one might check error codes (e.g., '42P01' for undefined table in PostgreSQL)
      // For now, a general error message is shown.
      console.error('Error checking for product associations (table or column might be missing):', productError.message);
      // Proceeding with deletion if the check itself fails, as 'products' table might not exist yet.
      // A stricter approach would be to fail here.
      // return fail(500, { message: `Error checking for products in this category: ${productError.message}` });
    } else if (productCount && productCount > 0) {
      return fail(400, { message: `Cannot delete category: It has ${productCount} products assigned. Please reassign them first.` });
    }

    const { error: deleteError } = await locals.supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      return fail(500, { message: `Failed to delete category: ${deleteError.message}` });
    }

    throw redirect(303, '/app/admin/categories?message=Category deleted successfully');
  },
};
