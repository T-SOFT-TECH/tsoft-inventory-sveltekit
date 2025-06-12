import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized: You must be logged in to perform this action.');
  }
  // Add admin check or specific permission check if generating invoices is restricted
  // Example: if (locals.user.email !== ADMIN_EMAIL) {
  //   throw error(403, 'Forbidden: You do not have permission to generate invoices.');
  // }

  const { invoiceId } = params;
  if (!invoiceId) {
    throw error(400, 'Invoice ID is required.');
  }

  // 1. Fetch Full Invoice Data
  // Corrected approach: Fetch invoice and its direct relations, then sale_items separately.
  const { data: invoiceDetails, error: invoiceDetailsError } = await locals.supabase
    .from('invoices')
    .select(`
      *,
      sales (
        *,
        customers (*),
        users (email)
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (invoiceDetailsError || !invoiceDetails) {
    console.error(`Error fetching invoice details for ID ${invoiceId}:`, invoiceDetailsError);
    throw error(404, { message: `Invoice not found or error fetching details: ${invoiceDetailsError?.message || 'No invoice returned'}` });
  }

  if (!invoiceDetails.sales) {
    // This implies invoice.sale_id might be null or points to a non-existent sale.
    // If sale_id is a non-nullable FK, this indicates a data integrity problem.
    console.error(`Sale data missing for invoice ${invoiceDetails.id}. Sale ID on invoice: ${invoiceDetails.sale_id}`);
    throw error(500, { message: `Critical data error: Sale information is missing for invoice ${invoiceDetails.id}. Cannot generate PDF.` });
  }

  // Sale items are not directly nested under invoices if the relation is invoices -> sales -> sale_items.
  // They need to be fetched using the sale_id from the invoiceDetails.sales object.
  const { data: saleItems, error: itemsError } = await locals.supabase
    .from('sale_items')
    .select(`
      *,
      products (name, sku)
    `)
    .eq('sale_id', invoiceDetails.sale_id);

  if (itemsError) {
    console.error(`Error fetching sale items for sale ID ${invoiceDetails.sale_id}:`, itemsError);
    throw error(500, { message: `Failed to fetch sale items for PDF generation: ${itemsError.message}` });
  }

  const fullInvoiceData = {
    ...invoiceDetails,
    items: saleItems ?? [] // Attach sale_items to the main invoice object for PDF generation context
  };


  // 2. Simulate PDF Generation & Storage Upload
  // In a real scenario, you'd generate a PDF here using a library like pdfmake, puppeteer, etc.
  // const pdfBuffer = await generateActualPdf(fullInvoiceData); // Your PDF generation logic

  // Simulate file path and get public URL
  // Using a consistent naming convention for the PDF in storage.
  const simulatedFilePath = `invoices_pdf/${invoiceDetails.invoice_number}.pdf`; // Path within the 'invoices' bucket

  // Simulate upload (in a real scenario, this would be after PDF generation)
  // const { error: uploadError } = await locals.supabase.storage
  //   .from('invoices') // Bucket name should match your Supabase storage bucket for invoices
  //   .upload(simulatedFilePath, pdfBuffer, { // pdfBuffer would be ArrayBuffer or Blob
  //     contentType: 'application/pdf',
  //     upsert: true, // Overwrite if it already exists for this invoice number
  //   });
  // if (uploadError) {
  //   console.error(`Simulated PDF Upload Error for ${simulatedFilePath}:`, uploadError);
  //   throw error(500, { message: `Failed to upload PDF (simulated): ${uploadError.message}` });
  // }

  // Get the public URL (this part is real, assuming the file path would exist after upload)
  const { data: storagePublicUrlData } = locals.supabase.storage
    .from('invoices') // Bucket name
    .getPublicUrl(simulatedFilePath);

  const pdfUrl = storagePublicUrlData.publicUrl;


  // 3. Update `invoices` table with `pdf_url`
  const { error: updateError } = await locals.supabase
    .from('invoices')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);

  if (updateError) {
    console.error(`Error updating invoice ${invoiceId} with PDF URL:`, updateError);
    // If PDF was "uploaded" but DB update fails, there's an inconsistency.
    // A real implementation might try to delete the uploaded PDF from storage here if DB update fails.
    throw error(500, { message: `Failed to update invoice with PDF URL: ${updateError.message}` });
  }

  // 4. Return success
  return json({
    success: true,
    pdfUrl: pdfUrl, // The simulated or actual public URL
    invoiceId: invoiceId,
    message: `PDF URL (simulated) for invoice ${invoiceDetails.invoice_number} generated and saved.`
  });
};
