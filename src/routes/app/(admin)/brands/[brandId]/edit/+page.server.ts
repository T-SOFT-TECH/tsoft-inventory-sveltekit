import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // RouteParams is implicitly available via params

export const load: PageServerLoad = async ({ locals, params }) => {
  const { brandId } = params; // SvelteKit automatically provides params from the route

  const { data: brand, error: dbError } = await locals.supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (dbError || !brand) {
    throw error(404, { message: `Brand not found: ${dbError?.message || 'No brand with this ID.'}` });
  }

  return {
    brand, // Pass the fetched brand to the page component
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const { brandId } = params;
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const logo_url = formData.get('logo_url')?.toString()?.trim();

    // For returning values to the form, including the original brand ID
    // The `brand` object structure in fail should match what the form expects for repopulation.
    const returnData = {
      // It's good practice to pass back the original data structure from `load`
      // or at least the fields the form uses, so it can repopulate.
      // If `form.brand` is used in Svelte, then `brand` should be a key here.
      id: brandId, // Pass id for context, though not directly a form field
      name: name ?? '',
      logo_url: logo_url ?? '',
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
        new URL(logo_url); // Basic URL validation
      } catch (_) {
        returnData.invalidUrl = true;
        returnData.message = 'The provided Logo URL is not valid. Please include http:// or https://';
        return fail(400, returnData);
      }
    }

    const dataToUpdate = {
      name,
      logo_url: logo_url || null, // Ensure empty string becomes null for DB
      // updated_at: new Date().toISOString(), // If your schema uses this and it's not auto-updated by DB
    };

    const { error: updateError } = await locals.supabase
      .from('brands')
      .update(dataToUpdate)
      .eq('id', brandId)
      .select() // Optionally get the updated record back
      .single();


    if (updateError) {
      console.error('Error updating brand:', updateError);
      // Pass back the attempted data for form repopulation
      returnData.name = name;
      returnData.logo_url = logo_url ?? '';

      if (updateError.code === '23505') { // Unique violation
        returnData.duplicateName = true;
        returnData.message = 'Another brand with this name already exists.';
        return fail(400, returnData);
      }
      returnData.message = `Failed to update brand: ${updateError.message}`;
      return fail(500, returnData);
    }

    // If successful, redirect to the brands list page with a success message
    throw redirect(303, `/app/admin/brands?message=Brand '${name}' updated successfully`);
  },
};
