import { error, redirect } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    // This should ideally be caught by the /app layout, but defense in depth
    throw redirect(303, '/auth/login?redirectTo=/app/invoices');
  }

  let query = locals.supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      issue_date,
      status,
      pdf_url, // <<< ADDED pdf_url HERE
      sale_id,
      sales (
        id,
        final_amount,
        user_id, /* The user_id from the sales table */
        customers ( id, name ) /* customers.name, customers.id */
      )
    `)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false, referencedTable: 'invoices' }); // Specify table for created_at if ambiguous

  const isAdmin = locals.user.email === ADMIN_EMAIL;

  if (!isAdmin) {
    // Non-admins only see invoices linked to sales they themselves created.
    // This requires that the 'sales' table has a 'user_id' column that correctly
    // references the `auth.users.id` of the user who made the sale.
    query = query.eq('sales.user_id', locals.user.id);
  }

  const { data: invoices, error: dbError } = await query;

  if (dbError) {
    console.error('Error fetching invoices:', dbError);
    throw error(500, { message: `Could not fetch invoices: ${dbError.message}` });
  }

  // Process invoices to ensure the shape is what the Svelte page expects,
  // especially handling the nested data which Supabase client returns as an array
  // if it's a one-to-many (though for invoices->sales it should be one-to-one).
  // If 'sales' is an object (due to .single() on a one-to-one join or view), this map might not be needed.
  // However, Supabase default for foreign key relation is an array.
  // Let's assume `sales` relation on `invoices` is set up as one-to-one,
  // or that the select query with `sales(*)` on a FK `sale_id` correctly returns an object or null.
  // If `sales` is an array (e.g. `invoice.sales[0]`), adjust access in Svelte or here.
  // For this example, we assume the direct select `sales(...)` on a FK `sale_id` provides `invoice.sales` as an object.
  // If `invoice.sales` is an array because of how the relationship is defined (e.g. view, or just how Supabase handles it sometimes),
  // you would do: `const saleData = Array.isArray(invoice.sales) ? invoice.sales[0] : invoice.sales;`

  return {
    invoices: invoices?.map(inv => ({
        ...inv,
        // Ensure sales and customers are directly accessible or properly shaped if they are arrays
        // If `inv.sales` is an object due to a one-to-one relation or single select:
        customerName: inv.sales?.customers?.name ?? 'N/A (Walk-in or no customer data)',
        finalAmount: inv.sales?.final_amount,
        // If `inv.sales` could be an array (less likely for FK join if `invoices.sale_id` is unique)
        // customerName: Array.isArray(inv.sales) && inv.sales.length > 0 ? inv.sales[0].customers?.name ?? 'N/A' : 'N/A',
        // finalAmount: Array.isArray(inv.sales) && inv.sales.length > 0 ? inv.sales[0].final_amount : undefined,
        pdf_url: inv.pdf_url // Ensure pdf_url is explicitly passed through if map is used
    })) ?? []
  };
};
