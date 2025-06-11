import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // RouteParams is implicitly available via params
import { z } from 'zod';

// Zod schema for customer update (similar to create, but adjust as needed)
const customerUpdateSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).trim(),
  email: z.string().email({ message: 'Invalid email format' })
    .nullable().optional().or(z.literal(''))
    .transform(val => val === '' ? null : val), // Transform empty string to null
  phone: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  address_line1: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  address_line2: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  city: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  postal_code: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  country: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
});

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    // This should ideally be caught by the /app layout, but defense in depth
    throw redirect(303, `/auth/login?redirectTo=/app/customers/${params.customerId}/edit`);
  }

  const { customerId } = params;
  const { data: customer, error: dbError } = await locals.supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (dbError || !customer) {
    throw error(404, { message: `Customer not found: ${dbError?.message || 'No customer with this ID.'}` });
  }

  return {
    customer, // Pass the fetched customer to the page component
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized. Please log in.'}); // Should not happen if load() is effective
    }

    const { customerId } = params;
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData.entries());

    // Fetch current customer's email to compare if it changed
    const { data: existingCustomer, error: fetchExistingError } = await locals.supabase
      .from('customers')
      .select('email')
      .eq('id', customerId)
      .single();

    if (fetchExistingError || !existingCustomer) {
      return fail(500, { fields: rawData, message: 'Could not retrieve existing customer data for email comparison.' });
    }

    const validation = customerUpdateSchema.safeParse(rawData);

    if (!validation.success) {
      return fail(400, {
        fields: rawData, // Use rawData for repopulating form with submitted values
        errors: validation.error.flatten().fieldErrors,
        message: 'Validation failed. Please check the errors below.',
      });
    }

    const validatedData = validation.data;

    // Email Uniqueness Check (if email changed)
    if (validatedData.email && validatedData.email !== existingCustomer.email) {
      const { data: existingWithNewEmail, error: emailCheckError } = await locals.supabase
        .from('customers')
        .select('id')
        .eq('email', validatedData.email)
        // .neq('id', customerId) // This check is implicit if the query for existingWithNewEmail is just for the email
        .maybeSingle();

      if (emailCheckError) {
        return fail(500, { fields: rawData, errors: { _general: ['Error checking email uniqueness.'] }, message: 'Server error while checking email uniqueness.' });
      }
      if (existingWithNewEmail && existingWithNewEmail.id !== customerId) { // Ensure it's not the same customer if email was "changed" to same value but different case
        return fail(400, {
          fields: rawData,
          errors: { email: ['This email address is already in use by another customer.'] },
          message: 'This email address is already in use.',
        });
      }
    }

    const dataToUpdate = {
      name: validatedData.name,
      email: validatedData.email, // Already transformed to null if empty
      phone: validatedData.phone,
      address_line1: validatedData.address_line1,
      address_line2: validatedData.address_line2,
      city: validatedData.city,
      postal_code: validatedData.postal_code,
      country: validatedData.country,
      updated_at: new Date().toISOString(), // Assuming you have an updated_at column
    };

    const { error: updateError } = await locals.supabase
      .from('customers')
      .update(dataToUpdate)
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer:', updateError);
       // Supabase might return a more specific code for unique constraint if email check was somehow bypassed (e.g. race condition)
      if (updateError.code === '23505' && updateError.message.includes('customers_email_key')) {
         return fail(400, { fields: rawData, errors: { email: ['This email is already in use by another customer.'] }, message: 'This email is already in use.' });
      }
      return fail(500, {
        fields: rawData,
        errors: { _general: [`Failed to update customer: ${updateError.message}`] },
        message: `Failed to update customer: ${updateError.message}`,
      });
    }

    throw redirect(303, `/app/customers?message=Customer '${validatedData.name}' updated successfully`);
  },
};
