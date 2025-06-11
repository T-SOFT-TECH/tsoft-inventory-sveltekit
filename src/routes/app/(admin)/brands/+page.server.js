import { error, fail, redirect } from '@sveltejs/kit'; // Added fail and redirect for future delete action

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  // Admin access is verified by the /app/(admin)/+layout.server.js
  const { data: brands, error: dbError } = await locals.supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching brands:', dbError);
    throw error(500, `Could not fetch brands: ${dbError.message}`);
  }

  return {
    brands: brands ?? [], // Ensure brands is always an array
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  // Delete action will be added here in a subsequent task.
  // For now, define it so the Svelte page doesn't error on `action="?/delete..."`
  delete: async ({ url, locals }) => {
    const brandId = url.searchParams.get('id');
    if (!brandId) {
      return fail(400, { message: 'Brand ID not provided for deletion.' });
    }

    // Placeholder for actual delete logic:
    // 1. Check for product associations (similar to categories)
    //    const { count: productCount, error: productError } = await locals.supabase
    //      .from('products')
    //      .select('id', { count: 'exact', head: true })
    //      .eq('brand_id', brandId);
    //    Handle productError and productCount > 0 (return fail)

    // 2. Perform deletion
    //    const { error: deleteError } = await locals.supabase
    //      .from('brands')
    //      .delete()
    //      .eq('id', brandId);
    //    Handle deleteError (return fail)

    // 3. Redirect on success
    //    throw redirect(303, '/app/admin/brands?message=Brand deleted successfully');

    // Product Association Check
    // Assumes a 'products' table with a 'brand_id' column.
    // The database schema for products.brand_id is ON DELETE SET NULL,
    // so this check serves as a warning before that happens.
    const { count: productCount, error: productError } = await locals.supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    if (productError) {
      console.error('Error checking for products associated with brand:', productError);
      return fail(500, { message: `Error checking for products associated with this brand: ${productError.message}` });
    }

    if (productCount && productCount > 0) {
      // This message informs the user that products will lose their brand association.
      // It uses fail(400) to make the user acknowledge this before proceeding,
      // even though the DB allows the operation (SET NULL).
      // A more advanced UX might have a two-step confirm or list affected products.
      return fail(400, { message: `Cannot delete brand: It has ${productCount} products assigned. These products will lose their brand association. If this is not desired, please reassign them first. (To proceed with deletion and unassign products, you would typically need an explicit confirmation step not implemented here).` });
      // If strict prevention was required:
      // return fail(400, { message: `Cannot delete brand: It has ${productCount} products assigned. Please reassign them first.` });
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
  }
};
