import { fail, redirect, error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, params }) => {
  const { brandId } = params;

  // Fetch the brand to be edited
  const { data: brand, error: dbError } = await locals.supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (dbError || !brand) {
    throw error(404, `Brand not found: ${dbError?.message || 'No such brand.'}`);
  }

  return {
    brand, // Pass the fetched brand to the page
  };
};

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, locals, params }) => {
    const { brandId } = params;
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const logo_url = formData.get('logo_url')?.toString()?.trim();

    // Store current values for repopulating form on error
    const formValues = { name, logo_url };

    if (!name) {
      return fail(400, {
        ...formValues,
        missingName: true,
        message: 'Brand name is required.',
      });
    }

    if (logo_url) {
      try {
        new URL(logo_url); // Validate URL format
      } catch (_) {
        return fail(400, {
          ...formValues,
          invalidUrl: true,
          message: 'The provided Logo URL is not valid.',
        });
      }
    }

    const dataToUpdate = {
      name,
      logo_url: logo_url || null, // Ensure empty string becomes null
      updated_at: new Date().toISOString(), // Assuming you have an updated_at column
    };

    const { error: updateError } = await locals.supabase
      .from('brands')
      .update(dataToUpdate)
      .eq('id', brandId);

    if (updateError) {
      console.error('Error updating brand:', updateError);
      if (updateError.code === '23505' && updateError.message.includes('brands_name_key')) { // Adjust constraint name if necessary
        return fail(400, {
          ...formValues,
          duplicateName: true,
          message: 'Another brand with this name already exists.',
        });
      }
      return fail(500, {
        ...formValues,
        message: `Failed to update brand: ${updateError.message}`,
      });
    }

    throw redirect(303, `/app/admin/brands?message=Brand '${name}' updated successfully`);
  },
};
