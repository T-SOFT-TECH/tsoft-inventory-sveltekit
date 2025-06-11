import { error, redirect } from '@sveltejs/kit'; // Added redirect for auth check
import type { PageServerLoad } from './$types'; // RouteParams is implicitly available via params

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    // This should ideally be caught by the /app layout, but defense in depth
    throw redirect(303, `/auth/login?redirectTo=/app/invoices/${params.invoiceId}`);
  }

  const { invoiceId } = params;

  const { data: invoice, error: invoiceError } = await locals.supabase
    .from('invoices')
    .select(`
      *,
      sales (
        *,
        customers (id, name, email, phone, address_line1, address_line2, city, postal_code, country),
        users ( email )
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    console.error(`Error fetching invoice ${invoiceId}:`, invoiceError);
    throw error(404, { message: `Invoice not found: ${invoiceError?.message || 'No invoice returned for this ID.'}` });
  }

  // The 'sales' relation on 'invoices' table should be a one-to-one (or one-to-zero if sale_id is nullable).
  // If invoice.sales is null here, it means the sale_id on the invoice record is null or points to a non-existent sale.
  // This would be a data integrity issue if sale_id is expected to be NOT NULL.
  if (!invoice.sales) {
      // If sale_id is nullable and can be legitimately null (e.g. for a pro-forma invoice not yet linked to a sale)
      // then this might not be an error, but the page would need to handle a null sale object.
      // For now, assuming sale_id is NOT NULL and this indicates an issue.
      console.error(`Data integrity issue: Sale data missing for invoice ${invoice.id}. Sale ID on invoice: ${invoice.sale_id}`);
      throw error(500, { message: `Critical data error: Sale information is missing for invoice ${invoice.id}. Please contact support.` });
  }

  const { data: items, error: itemsError } = await locals.supabase
    .from('sale_items')
    .select(`
      *,
      products (id, name, sku)
    `)
    .eq('sale_id', invoice.sale_id); // Use invoice.sale_id from the fetched invoice

  if (itemsError) {
    console.error(`Error fetching items for sale ${invoice.sale_id}:`, itemsError);
    throw error(500, { message: `Error fetching invoice items: ${itemsError.message}` });
  }

  // Note on `invoice.sales.users`:
  // If `users` is a view on `auth.users` that requires admin/service_role, this might return null
  // if RLS prevents access or the join isn't straightforward for the current user's role.
  // The current setup assumes `locals.supabase` (using anon or user role) can fetch this.
  // If `invoice.sales.user_id` is the ID of the currently logged-in user, RLS might allow it.
  // If it's for another user, and no specific RLS/view allows, `invoice.sales.users` could be null or restricted.
  // The Svelte page will need to handle `invoice.sales.users?.email` gracefully.

  return {
    invoice,        // Contains nested 'sales', which contains nested 'customers' and 'users (email)'
    items: items ?? []  // The list of sale items with nested product details
  };
};
