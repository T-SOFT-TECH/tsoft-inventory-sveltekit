import { error, redirect, fail } from '@sveltejs/kit'; // Added fail
import type { PageServerLoad, Actions } from './$types'; // Added Actions, RouteParams is implicitly available
import { z } from 'zod'; // Added Zod import

// Allowed invoice statuses for validation
const allowedInvoiceStatuses = ['unpaid', 'paid', 'overdue', 'cancelled', 'draft', 'void'] as const;
const statusUpdateSchema = z.object({
    status: z.enum(allowedInvoiceStatuses, {
        errorMap: () => ({ message: 'Invalid status selected. Please choose from the allowed values.' })
    })
});

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

export const actions: Actions = {
  generatePdf: async ({ locals, params, fetch }) => {
    if (!locals.user) {
      // This check is redundant if the parent layout already protects, but good for direct action calls.
      throw error(401, 'Unauthorized');
    }
    const invoiceId = params.invoiceId;

    if (!invoiceId) {
        return fail(400, { action: 'generatePdf', message: 'Invoice ID is missing.' });
    }

    // Call the API endpoint to generate the PDF
    // The `fetch` provided by SvelteKit should be used for same-origin requests in server-side code.
    const apiResponse = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
      method: 'POST',
      // Body might be needed if your API expects it, e.g., for CSRF token if not handled by SvelteKit hooks
      // For now, assuming no body is needed as invoiceId is in the URL.
    });

    if (!apiResponse.ok) {
      let errorData;
      try {
        errorData = await apiResponse.json();
      } catch (e) {
        errorData = { message: `Failed to generate PDF (status: ${apiResponse.status}) and could not parse error response.` };
      }
      return fail(apiResponse.status, {
        action: 'generatePdf',
        message: errorData?.message || `Failed to generate PDF (status: ${apiResponse.status}). Please try again.`
      });
    }

    try {
      const result = await apiResponse.json();

      if (result.success && result.pdfUrl) {
        // The API route already updated the database with the PDF URL.
        // Returning the pdfUrl and success allows the client to potentially use it immediately.
        // invalidateAll() on the client will ensure the main `data.invoice.pdf_url` is fresh from the `load` function.
        return {
          success: true,
          action: 'generatePdf',
          pdfUrl: result.pdfUrl,
          message: result.message || 'PDF generated and URL saved successfully.'
        };
      } else {
        return fail(500, {
          action: 'generatePdf',
          message: result.message || 'PDF generation API call seemed to succeed but did not return a valid PDF URL.'
        });
      }
    } catch (e: any) {
        console.error("Error parsing JSON response from PDF API:", e);
        return fail(500, {
            action: 'generatePdf',
            message: `Error processing response from PDF generation: ${e.message}`
        });
    }
  }
  // Potentially other actions like:
  // updateInvoiceStatus: async ({ request, locals, params }) => { ... }
  // sendInvoiceByEmail: async ({ request, locals, params }) => { ... }

  updateStatus: async ({ request, locals, params }) => {
    if (!locals.user) {
        // Redundant check if parent layout protects, but good for direct action calls
        throw error(401, 'Unauthorized: You must be logged in to update status.');
    }
    // Add admin/role check here if updating status is restricted
    // Example: if (locals.user.email !== ADMIN_EMAIL) {
    //   return fail(403, { action: 'updateStatus', message: 'Forbidden: Not authorized to update status.' });
    // }

    const invoiceId = params.invoiceId;
    const formData = await request.formData();
    const newStatus = formData.get('status') as string; // Zod will validate this

    const validation = statusUpdateSchema.safeParse({ status: newStatus });

    if (!validation.success) {
        return fail(400, {
            action: 'updateStatus',
            currentStatus: formData.get('current_invoice_status'), // For repopulating select if needed
            errors: validation.error.flatten().fieldErrors,
            message: validation.error.flatten().fieldErrors.status?.[0] || 'Invalid status value provided.'
        });
    }

    const { error: updateError } = await locals.supabase
        .from('invoices')
        .update({ status: validation.data.status, updated_at: new Date().toISOString() })
        .eq('id', invoiceId);

    if (updateError) {
        console.error(`Error updating invoice ${invoiceId} status to ${validation.data.status}:`, updateError);
        return fail(500, {
            action: 'updateStatus',
            currentStatus: formData.get('current_invoice_status'),
            message: `Failed to update invoice status: ${updateError.message}`
        });
    }

    return {
        success: true,
        action: 'updateStatus',
        message: `Invoice status successfully updated to ${validation.data.status}.`
    };
  },

  sendInvoiceEmail: async ({ request, locals, params }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized: You must be logged in to send an invoice email.');
    }
    const invoiceId = params.invoiceId;

    // Fetch invoice details needed for email (pdf_url, customer email from snapshot or live)
    const { data: invoice, error: invoiceFetchError } = await locals.supabase
        .from('invoices')
        .select('invoice_number, pdf_url, customer_details_snapshot, sales(customers(email))')
        .eq('id', invoiceId)
        .single();

    if (invoiceFetchError || !invoice) {
        return fail(404, {
            action: 'sendInvoiceEmail',
            message: `Invoice not found or error fetching details: ${invoiceFetchError?.message || 'No invoice data'}`
        });
    }

    if (!invoice.pdf_url) {
        return fail(400, {
            action: 'sendInvoiceEmail',
            message: 'PDF for this invoice has not been generated yet. Please generate PDF first before sending.'
        });
    }

    // Prioritize email from customer_details_snapshot, then from live customer data via sales relation
    const customerEmail = invoice.customer_details_snapshot?.email || invoice.sales?.customers?.email;

    if (!customerEmail) {
        return fail(400, {
            action: 'sendInvoiceEmail',
            message: 'Customer email not found for this invoice. Cannot send email. Please update customer details.'
        });
    }

    // Simulate email sending
    console.log(`SIMULATING INVOICE EMAIL SEND:
        To: ${customerEmail}
        Subject: Invoice ${invoice.invoice_number} from Your Company
        Body: Dear Customer, Please find your invoice ${invoice.invoice_number} attached.
        Attachment URL (link in email body): ${invoice.pdf_url}
    `);

    // TODO: Actual email sending logic would be implemented here.
    // This could involve calling a Supabase Edge Function that uses an email service (e.g., Resend, SendGrid).
    // Example:
    // const { data: emailResult, error: emailError } = await locals.supabase.functions.invoke('send-invoice-email', {
    //   body: { to: customerEmail, subject: `Invoice ${invoice.invoice_number}`, invoiceUrl: invoice.pdf_url }
    // });
    // if (emailError) return fail(500, { action: 'sendInvoiceEmail', message: `Email sending failed: ${emailError.message}` });

    // For now, simulation is success.
    return {
        success: true,
        action: 'sendInvoiceEmail',
        message: `Email for invoice ${invoice.invoice_number} (simulated) "sent" to ${customerEmail}.`
    };
  }
};
