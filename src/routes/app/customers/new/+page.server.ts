import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';

// Zod schema for customer creation
const customerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).trim(),
  email: z.string().email({ message: 'Invalid email format' })
    .nullable().optional().or(z.literal('')) // Optional, but if given, must be valid email or empty
    .transform(val => val === '' ? null : val), // Transform empty string to null for DB
  phone: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  address_line1: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  address_line2: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  city: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  postal_code: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  country: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
});

// No load function specified for this page

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData.entries());

    // Ensure user is logged in (basic access control)
    if (!locals.user) {
        return fail(401, { fields: rawData, message: 'Unauthorized: You must be logged in to create a customer.' });
    }
    // Add role/permission check here if creating customers is restricted
    // Example: if (!userHasRole(locals.user, 'can_create_customers')) {
    //   return fail(403, { fields: rawData, message: 'Forbidden: You do not have permission.' });
    // }

    const validation = customerSchema.safeParse(rawData);

    if (!validation.success) {
      return fail(400, {
        fields: rawData, // Send back original string data for repopulation
        errors: validation.error.flatten().fieldErrors,
        message: 'Validation failed. Please check the errors below.',
      });
    }

    // Data is now validated and transformed (empty strings to nulls for optional fields)
    const dataToInsert = {
      ...validation.data,
      // user_id: locals.user.id, // Optional: if you want to associate customer with the user who created them
    };

    const { data: newCustomer, error: insertError } = await locals.supabase
      .from('customers')
      .insert(dataToInsert)
      .select() // Optionally select the inserted data
      .single();

    if (insertError) {
      console.error('Error creating customer:', insertError);
      const fieldsForRepopulation = { ...rawData }; // Use rawData for repopulation
      if (insertError.code === '23505' && insertError.message.includes('customers_email_key')) { // Adjust key name if necessary
        return fail(400, {
          fields: fieldsForRepopulation,
          errors: { email: ['This email address is already in use.'] },
          message: 'This email address is already in use.',
        });
      }
      return fail(500, {
        fields: fieldsForRepopulation,
        errors: { _general: [`Failed to create customer: ${insertError.message}`] },
        message: `Failed to create customer: ${insertError.message}`,
      });
    }

    throw redirect(303, `/app/customers?message=Customer '${newCustomer?.name ?? validation.data.name}' created successfully`);
  },
};
