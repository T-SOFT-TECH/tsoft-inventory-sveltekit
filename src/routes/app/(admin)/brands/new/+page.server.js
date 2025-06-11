import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString()?.trim(); // Trim whitespace
    const logo_url = formData.get('logo_url')?.toString()?.trim(); // Trim whitespace

    if (!name) {
      return fail(400, {
        name, // name will be empty or null here
        logo_url,
        missingName: true,
        message: 'Brand name is required.',
      });
    }

    // Optional: Validate logo_url format if a value is provided
    if (logo_url) {
      try {
        new URL(logo_url); // Will throw an error if URL is invalid
      } catch (_) {
        return fail(400, {
          name,
          logo_url,
          invalidUrl: true,
          message: 'The provided Logo URL is not valid.',
        });
      }
    }

    const dataToInsert = {
      name,
      logo_url: logo_url || null, // Ensure empty string becomes null if DB prefers
      // user_id: locals.user.id // If tracking who created the brand
    };

    const { error: insertError } = await locals.supabase
      .from('brands')
      .insert(dataToInsert)
      .select(); // .select() can be useful to get the inserted data back, though not used here

    if (insertError) {
      console.error('Error creating brand:', insertError);
      // Check for unique constraint violation on 'name'
      // Supabase/PostgREST error code for unique violation is '23505'
      if (insertError.code === '23505' && insertError.message.includes('brands_name_key')) { // Adjust 'brands_name_key' if your constraint has a different name
        return fail(400, {
          name,
          logo_url,
          duplicateName: true,
          message: 'A brand with this name already exists.',
        });
      }
      return fail(500, {
        name,
        logo_url,
        message: `Failed to create brand: ${insertError.message}`,
      });
    }

    // On successful creation, redirect to the main brands list page
    throw redirect(303, '/app/admin/brands?message=Brand created successfully');
  },
};
