import { error, fail, redirect } from '@sveltejs/kit'; // Added redirect
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: products, error: dbError } = await locals.supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      selling_price,
      current_stock,
      description,
      created_at,
      updated_at,
      category_id,
      brand_id,
      categories ( name ),
      brands ( name )
    `)
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching products:', dbError);
    // For load functions, throwing an error is appropriate as it will be caught by SvelteKit's
    // error handling and show an error page (+error.svelte).
    throw error(500, { message: `Could not fetch products: ${dbError.message}` });
  }

  // The products will have categories: { name: '...' } and brands: { name: '...' }
  // If category_id or brand_id is null, the corresponding categories/brands object will be null.
  return {
    products: products ?? [],
  };
};

export const actions: Actions = {
  delete: async ({ url, locals }) => {
    const productId = url.searchParams.get('id');
    if (!productId) {
      return fail(400, { message: 'Product ID not provided for deletion.' });
    }

    // Sale Items Check (Due to ON DELETE RESTRICT)
    // This check is crucial if `sale_items.product_id` has an ON DELETE RESTRICT foreign key constraint.
    const { count: saleItemsCount, error: saleItemsError } = await locals.supabase
      .from('sale_items') // Assuming 'sale_items' is the correct table name
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (saleItemsError) {
      console.error('Error checking for sale items associated with product:', saleItemsError);
      // This could indicate the table doesn't exist or a more general DB issue.
      // It's safer to prevent deletion if this check fails.
      return fail(500, { message: `Error checking for sales associated with this product: ${saleItemsError.message}. Please ensure 'sale_items' table exists and is queryable.` });
    }

    if (saleItemsCount && saleItemsCount > 0) {
      return fail(400, { message: `Cannot delete product: It is part of ${saleItemsCount} sale transaction(s). Products that have been sold cannot be deleted directly to maintain sales history integrity.` });
    }

    // Perform Deletion
    // Note: Other tables might also have ON DELETE RESTRICT for product_id (e.g., stock_transactions, inventory_adjustments).
    // If those are not handled or data is not cleared, this delete will fail at DB level.
    // For this task, only sale_items is explicitly checked.
    const { error: deleteError } = await locals.supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Failed to delete product:', deleteError);
      // The error message might give clues if it's a foreign key violation from another table.
      return fail(500, { message: `Failed to delete product: ${deleteError.message}. This could be due to other existing references to this product (e.g., in stock transactions if not cleared).` });
    }

    // Redirect on Success
    throw redirect(303, '/app/admin/products?message=Product deleted successfully');
  },
};
