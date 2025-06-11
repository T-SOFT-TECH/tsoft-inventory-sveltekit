import { error, fail, redirect } from '@sveltejs/kit'; // Added redirect
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Access control: Ensure user is logged in.
  // Specific roles/permissions might be checked here if needed for non-admin users.
  if (!locals.user) {
    throw error(401, 'You must be logged in to view customers.');
  }

  const { data: customers, error: dbError } = await locals.supabase
    .from('customers')
    .select('id, name, email, phone, city, created_at') // Added created_at for more info
    .order('name', { ascending: true });

  if (dbError) {
    console.error('Error fetching customers:', dbError);
    throw error(500, { message: `Could not fetch customers: ${dbError.message}` });
  }

  return {
    customers: customers ?? [],
  };
};

export const actions: Actions = {
  delete: async ({ url, locals }) => {
    const customerId = url.searchParams.get('id');

    // Access control for delete action
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized: You must be logged in.' });
    }
    // Add role/permission check here if delete is admin-only or specific roles
    // Example: if (locals.user.email !== ADMIN_EMAIL && !userHasRole(locals.user, 'can_delete_customers')) {
    //   return fail(403, { message: 'Forbidden: You do not have permission to delete customers.' });
    // }

    if (!customerId) {
      return fail(400, { message: 'Customer ID not provided for deletion.' });
    }

    // Sales Association Check
    const { count: salesCount, error: salesCheckError } = await locals.supabase
      .from('sales') // Assuming 'sales' table exists
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    if (salesCheckError) {
      console.error('Error checking sales for customer:', salesCheckError);
      return fail(500, { message: `Error checking for sales associated with this customer: ${salesCheckError.message}. Please ensure 'sales' table exists.` });
    }

    if (salesCount && salesCount > 0) {
      if (url.searchParams.get('confirmOrphanSales') !== 'true') {
        return fail(400, {
          message: `This customer is associated with ${salesCount} sales. Deleting this customer will make these sales anonymous (customer_id will be set to NULL). Are you sure you want to proceed?`,
          requiresConfirmation: true,
          customerId: customerId, // Pass back customerId for the confirmation action
          actionType: 'deleteCustomerWithSales' // Custom indicator for client-side
        });
      }
      // If confirmOrphanSales is true, proceed with deletion (orphaning sales records)
      // This assumes ON DELETE SET NULL on sales.customer_id. If it's RESTRICT, DB will error.
    }

    // Perform Deletion
    const { error: deleteError } = await locals.supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      console.error('Error deleting customer:', deleteError);
      // If ON DELETE RESTRICT was on sales.customer_id and sales existed, this would be a DB error.
      // The check above is to provide a better UX before hitting that potential DB error.
      return fail(500, { message: `Failed to delete customer: ${deleteError.message}` });
    }

    // Redirect on Success
    throw redirect(303, '/app/customers?message=Customer deleted successfully');
  },
};
