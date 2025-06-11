import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

// No load function needed for this page as per requirements

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString()?.trim();
    const logo_url = formData.get('logo_url')?.toString()?.trim();

    // Prepare data to return to the form in case of failure
    const returnData = {
      name: name ?? '', // Ensure name is not null for form repopulation
      logo_url: logo_url ?? '', // Ensure logo_url is not null
      missingName: false,
      invalidUrl: false,
      duplicateName: false,
      message: '',
    };

    if (!name) {
      returnData.missingName = true;
      returnData.message = 'Brand name is required.';
      return fail(400, returnData);
    }

    if (logo_url) {
      try {
        // Basic URL validation: checks if the URL can be parsed.
        // For more robust validation, consider a library or more complex regex.
        new URL(logo_url);
      } catch (_) {
        returnData.invalidUrl = true;
        returnData.message = 'The provided Logo URL is not valid. Please include http:// or https://';
        return fail(400, returnData);
      }
    }

    const dataToInsert = {
      name,
      logo_url: logo_url || null, // Store as null if empty
    };

    const { data: insertedData, error: insertError } = await locals.supabase
      .from('brands')
      .insert(dataToInsert)
      .select() // Using .select() to potentially get the created record back
      .single(); // Assuming insert returns the single created record

    if (insertError) {
      console.error('Error creating brand:', insertError);
      if (insertError.code === '23505') { // PostgreSQL unique violation code
        // More specific check for constraint name might be needed if there are multiple unique constraints
        // e.g., if (insertError.message.includes('brands_name_key'))
        returnData.duplicateName = true;
        returnData.message = 'A brand with this name already exists.';
        return fail(400, returnData);
      }
      returnData.message = `Failed to create brand: ${insertError.message}`;
      return fail(500, returnData);
    }

    // If successful, redirect to the brands list page with a success message
    throw redirect(303, `/app/admin/brands?message=Brand '${insertedData?.name ?? name}' created successfully`);
  },
};
