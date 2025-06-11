import { error, fail, redirect } from '@sveltejs/kit'; // Added redirect
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: brands, error: dbError } = await locals.supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching brands:', dbError);
    // For load functions, throwing an error is appropriate as it will be caught by SvelteKit's
    // error handling and show an error page (+error.svelte).
    throw error(500, { message: `Could not fetch brands: ${dbError.message}` });
  }

  return {
    brands: brands ?? [],
  };
};

export const actions: Actions = {
  delete: async ({ url, locals }) => {
    const brandId = url.searchParams.get('id');
    if (!brandId) {
      return fail(400, { message: 'Brand ID not provided for deletion.' });
    }

    // Product Association Check
    // Assumes a 'products' table with a 'brand_id' column.
    // The database schema for products.brand_id is expected to be ON DELETE SET NULL.
    // This check serves as a warning before that happens.
    const { count: productCount, error: productError } = await locals.supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    if (productError) {
      console.error('Error checking for products associated with brand:', productError);
      // If the 'products' table or 'brand_id' column doesn't exist, this check might fail.
      // Depending on strictness, you might allow deletion or block it.
      // For now, we'll return an error, assuming the check should be possible.
      return fail(500, { message: `Error checking for products associated with this brand: ${productError.message}. Please ensure products table and brand_id column exist.` });
    }

    if (productCount && productCount > 0) {
      // This message informs the user that products will lose their brand association.
      // It uses fail(400) to make the user acknowledge this before proceeding.
      return fail(400, { message: `Cannot delete brand: It has ${productCount} products assigned. These products will lose their brand association. If this is not desired, please reassign them first.` });
    }

    // Perform Deletion
    const { error: deleteError } = await locals.supabase
      .from('brands')
      .delete()
      .eq('id', brandId);

    if (deleteError) {
      console.error('Failed to delete brand:', deleteError);
      return fail(500, { message: `Failed to delete brand: ${deleteError.message}` });
    }

    // Redirect on Success
    throw redirect(303, '/app/admin/brands?message=Brand deleted successfully');
  },
};
