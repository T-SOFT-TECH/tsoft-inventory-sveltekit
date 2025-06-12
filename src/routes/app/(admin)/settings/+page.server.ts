import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { ADMIN_EMAIL } from '$env/static/private'; // For admin check

// Define the default settings structure for type safety and fallback
const defaultSettings = {
  id: 1, // Assuming a single row with a fixed ID
  company_name: 'My Awesome Company',
  company_address: '123 Main St, Anytown, USA',
  company_email: 'contact@example.com',
  company_phone: '+1-555-123-4567',
  company_logo_url: '', // URL to company logo
  default_currency_symbol: '$',
  default_tax_rate_percentage: 0.00, // e.g., 7.5 for 7.5%
  invoice_footer_text: 'Thank you for your business!',
  // Add any other settings fields that will be in your 'settings' table
  // created_at and updated_at are usually handled by DB
};

const settingsSchema = z.object({
  company_name: z.string().min(1, { message: 'Company name is required' }).trim(),
  company_address: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  company_email: z.string().email({ message: 'Invalid email format' })
    .trim().nullable().optional().or(z.literal(''))
    .transform(val => val === '' ? null : val),
  company_phone: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  company_logo_url: z.string().url({ message: 'Invalid URL for company logo' })
    .trim().nullable().optional().or(z.literal(''))
    .transform(val => val === '' ? null : val),
  default_currency_symbol: z.string().min(1, {message: 'Currency symbol is required'}).max(5, {message: 'Symbol must be 1-5 characters'}).trim(),
  default_tax_rate_percentage: z.preprocess(
      (val) => val === '' || val === null || val === undefined ? null : parseFloat(String(val)), // Convert empty or null to null for optional Zod number
      z.number({ invalid_type_error: 'Tax rate must be a number' })
          .min(0, { message: 'Tax rate cannot be negative' })
          .max(100, { message: 'Tax rate cannot exceed 100' })
          .nullable().optional() // Make it optional or provide a default if required
          .transform(val => val === null ? 0.00 : val) // Default to 0.00 if null after parsing
  ),
  invoice_footer_text: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
});


export const load: PageServerLoad = async ({ locals }) => {
  // Auth check handled by /app/(admin)/+layout.server.ts, but defense in depth is okay.
  if (!locals.user) {
    throw redirect(303, '/auth/login?redirectTo=/app/admin/settings');
  }
  // Further admin role check is also handled by parent layout.

  const { data: settings, error: dbError } = await locals.supabase
    .from('settings')
    .select('*')
    .eq('id', 1) // Assuming there's only one row for settings, with id = 1
    .maybeSingle(); // Use maybeSingle to handle case where row might not exist yet

  if (dbError && dbError.code !== 'PGRST116') {
    // PGRST116: "Actual row count does not match expected row count for single"
    // This code means "not found", which is acceptable here as we provide defaults.
    // Any other error code should be treated as a server error.
    console.error('Error fetching settings:', dbError);
    throw error(500, { message: `Could not fetch settings: ${dbError.message}` });
  }

  // Merge fetched settings with defaults to ensure all keys are present
  // Fetched settings will override defaults if they exist.
  const currentSettings = { ...defaultSettings, ...(settings || {}) };

  return {
    settings: currentSettings
  };
};

export const actions: Actions = {
  updateSettings: async ({ request, locals }) => {
    if (!locals.user || locals.user.email !== ADMIN_EMAIL) {
      // Explicit admin check for the action
      return fail(403, { action: 'updateSettings', message: 'Forbidden: You do not have permission to update settings.' });
    }

    const formData = await request.formData();
    const rawData = Object.fromEntries(formData.entries());

    // The rawData for default_tax_rate_percentage will be a string. Zod preprocess handles it.
    const validation = settingsSchema.safeParse(rawData);

    if (!validation.success) {
      return fail(400, {
        action: 'updateSettings',
        fields: rawData, // Send back original string data for repopulation
        errors: validation.error.flatten().fieldErrors,
        message: 'Validation failed. Please check the errors below.',
      });
    }

    const validatedData = validation.data;

    const settingsDataToUpsert = {
      id: 1, // Crucial for upserting the singleton settings row
      company_name: validatedData.company_name,
      company_address: validatedData.company_address, // Already null if empty due to transform
      company_email: validatedData.company_email,     // Already null if empty
      company_phone: validatedData.company_phone,     // Already null if empty
      company_logo_url: validatedData.company_logo_url, // Already null if empty
      default_currency_symbol: validatedData.default_currency_symbol,
      default_tax_rate_percentage: validatedData.default_tax_rate_percentage, // Zod handles parsing and default
      invoice_footer_text: validatedData.invoice_footer_text, // Already null if empty
      updated_at: new Date().toISOString(), // Keep track of the last update
    };

    const { data: upsertedData, error: upsertError } = await locals.supabase
      .from('settings')
      .upsert(settingsDataToUpsert, { onConflict: 'id' }) // Upsert on the 'id' column constraint
      .select() // Optionally select the data to confirm/return
      .single(); // Expect a single row back

    if (upsertError) {
      console.error('Error updating settings:', upsertError);
      return fail(500, {
        action: 'updateSettings',
        fields: rawData,
        errors: { _general: [`Failed to update settings: ${upsertError.message}`] },
        message: `Failed to update settings: ${upsertError.message}`,
      });
    }

    return {
      success: true,
      action: 'updateSettings',
      message: 'Application settings updated successfully.',
      updatedSettings: upsertedData // Optionally return updated settings if needed by client beyond invalidateAll
    };
  },
};
