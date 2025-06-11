import { error, fail, redirect } from '@sveltejs/kit'; // Added fail and redirect

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
  // The (admin)/+layout.server.js should have already verified admin status.
  // We can proceed to fetch data specific to this page.

  const { data: categories, error: dbError } = await locals.supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching categories:', dbError);
    throw error(500, `Could not fetch categories: ${dbError.message}`); // Use throw error for load functions
  }

  return {
    categories: categories ?? [], // Ensure categories is always an array
  };
};

// Actions for create/update/delete will be in separate files or added here later.
// For now, this page only loads categories.
// The delete action will be handled by this page's actions if using form actions on this page.
// But the prompt asks for the delete button to be on this page, so actions should go here.
// Let's add the delete action as well, as it's implied by the Svelte component.

export const actions = {
  delete: async ({ url, locals }) => { // Removed request as it's not used
    const categoryId = url.searchParams.get('id');
    if (!categoryId) {
      return fail(400, { message: 'Category ID not provided for deletion.' });
    }

    // Child Category Check
    const { count: childCount, error: childError } = await locals.supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoryId);

    if (childError) {
      console.error('Error checking child categories:', childError);
      return fail(500, { message: `Error checking for child categories: ${childError.message}` });
    }

    if (childCount && childCount > 0) {
      return fail(400, { message: 'Cannot delete category: It has child categories. Please reassign or delete them first.' });
    }

    // Product Association Check
    // Assuming 'products' table exists and has 'category_id' foreign key.
    // The actual behavior of products becoming uncategorized depends on `ON DELETE` rule for the FK.
    // If `ON DELETE SET NULL`, then products.category_id will become NULL.
    // If `ON DELETE RESTRICT` (or no rule and it defaults), this delete would fail at DB level if products exist.
    // This check provides a user-friendly message before attempting DB operation.
    const { count: productCount, error: productError } = await locals.supabase
      .from('products') // Assuming 'products' is the table name
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId); // Assuming 'category_id' is the FK in products table

    if (productError) {
      console.error('Error checking products in category:', productError);
      // It's possible the 'products' table or 'category_id' column doesn't exist.
      // For now, we'll treat this as a general error. A more robust check might verify table/column existence.
      return fail(500, { message: `Error checking for products in this category: ${productError.message}` });
    }

    if (productCount && productCount > 0) {
      // The message informs the user about products becoming uncategorized.
      // If strict prevention is desired, the message should change and no further action taken.
      // Given the ON DELETE SET NULL behavior for product.category_id, this is a warning.
      // However, for a better UX, we still use fail to make the user aware and confirm.
      // A more advanced UX might offer a "force delete" option or list affected products.
      return fail(400, { message: `Cannot delete category: It has ${productCount} products assigned. These products will become uncategorized. If you wish to proceed, please confirm or reassign them first. (This is a simulated confirmation step; actual deletion not yet implemented with force option).` });
      // For a strict prevention:
      // return fail(400, { message: `Cannot delete category: It has ${productCount} products assigned. Please reassign them first.` });
    }

    // Perform Deletion
    const { error: deleteError } = await locals.supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return fail(500, { message: `Failed to delete category: ${deleteError.message}` });
    }

    // Redirect on Success
    throw redirect(303, '/app/admin/categories?message=Category deleted successfully');
  }
};
