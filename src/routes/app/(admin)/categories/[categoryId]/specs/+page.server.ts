import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // RouteParams is implicitly available via params
import { z } from 'zod';

// Zod Schema for validating specification field data
const specFieldSchema = z.object({
  field_label: z.string().min(1, { message: 'Label is required' }).trim(),
  // field_name is auto-generated on create, and not updatable for existing fields.
  // It's validated separately if provided (e.g. during creation if manual override was allowed)
  field_name: z.string().min(1, { message: 'Name is required' })
                .regex(/^[a-z0-9_]+$/, { message: 'Name must be lowercase alphanumeric characters and underscores only.' })
                .trim(),
  field_type: z.enum(['text', 'number', 'select', 'checkbox', 'date', 'textarea', 'boolean'], {
    errorMap: () => ({ message: 'Invalid field type selected.' })
  }),
  options_str: z.string().trim().optional(), // Comma-separated, to be parsed if field_type is 'select'
  is_required: z.preprocess(
    (val) => String(val).toLowerCase() === 'true' || String(val) === 'on' || val === true,
    z.boolean()
  ),
  display_order: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? 0 : parseInt(String(val), 10),
    z.number().int().default(0)
  )
}).refine(data => {
  // Options are required only if field_type is 'select'
  if (data.field_type === 'select') {
    return data.options_str && data.options_str.trim() !== '';
  }
  return true;
}, {
  message: "Options are required for 'select' field type and cannot be empty.",
  path: ['options_str'], // Path of the error
});


export const load: PageServerLoad = async ({ locals, params }) => {
  const categoryId = params.categoryId;

  const { data: category, error: catError } = await locals.supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single();

  if (catError || !category) {
    throw error(404, { message: `Category not found: ${catError?.message ?? 'No category returned'}` });
  }

  const { data: specFields, error: fieldsError } = await locals.supabase
    .from('category_specification_fields')
    .select('*')
    .eq('category_id', categoryId)
    .order('display_order', { ascending: true })
    .order('field_label', { ascending: true });

  if (fieldsError) {
    console.error("Error fetching spec fields:", fieldsError);
    throw error(500, { message: `Error fetching specification fields: ${fieldsError.message}` });
  }

  return {
    category,
    specFields: specFields ?? []
  };
};

export const actions: Actions = {
  createSpecField: async ({ request, locals, params }) => {
    const categoryId = params.categoryId;
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    // field_name is part of rawData but will be validated by specFieldSchema

    const validation = specFieldSchema.safeParse(rawData);
    if (!validation.success) {
      return fail(400, {
        action: 'createSpecField',
        errors: validation.error.flatten().fieldErrors,
        fields: rawData, // Send back the raw string data for repopulation
        message: 'Validation failed. Please check the errors for creating the specification field.'
      });
    }

    const { field_label, field_name, field_type, options_str, is_required, display_order } = validation.data;
    const optionsArray = field_type === 'select' ? options_str?.split(',').map(s => s.trim()).filter(Boolean) : null;

    const { error: dbError } = await locals.supabase.from('category_specification_fields').insert({
      category_id: categoryId,
      field_label,
      field_name, // field_name is validated by Zod now
      field_type,
      options: optionsArray, // Supabase client handles JSON stringification for JSONB array
      is_required,
      display_order
    });

    if (dbError) {
      if (dbError.code === '23505') { // Unique constraint violation
        // Determine which field caused it based on dbError.details or message
        let fieldInError = 'field_name'; // Default, most likely
        if (dbError.message.includes('field_label')) fieldInError = 'field_label'; // Example
         return fail(400, { action: 'createSpecField', errors: { [fieldInError]: ['This field value already exists for this category.'] }, fields: rawData, message: 'A specification field with this name or label already exists.' });
      }
      return fail(500, { action: 'createSpecField', message: `Database error creating specification field: ${dbError.message}`, fields: rawData });
    }
    // No redirect, let the page reload and show the new field. Message can be passed via success.
    return { success: true, action: 'createSpecField', message: 'Specification field created successfully.' };
  },

  updateSpecField: async ({ request, locals, params, url }) => {
    const categoryId = params.categoryId;
    const specFieldId = url.searchParams.get('specFieldId');
    if (!specFieldId) return fail(400, { action: 'updateSpecField', message: 'Specification Field ID is missing from the request.' });

    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    // For update, field_name is not part of the validation schema as it's immutable
    // However, it's good to pass it along if needed for context or if it were part of rawData
    // For Zod, we only validate fields that can be updated.
    const updateSchema = specFieldSchema.omit({ field_name: true }); // field_name cannot be changed
    const validation = updateSchema.safeParse(rawData);

    if (!validation.success) {
      return fail(400, {
        action: 'updateSpecField',
        specFieldId,
        errors: validation.error.flatten().fieldErrors,
        fields: rawData, // Send back raw string data
        message: 'Validation failed for updating specification field.'
      });
    }
    const { field_label, field_type, options_str, is_required, display_order } = validation.data;
    const optionsArray = field_type === 'select' ? options_str?.split(',').map(s => s.trim()).filter(Boolean) : null;

    const { error: dbError } = await locals.supabase.from('category_specification_fields')
      .update({
        field_label,
        field_type,
        options: optionsArray,
        is_required,
        display_order,
        // updated_at: new Date().toISOString() // If your table has an updated_at column
      })
      .eq('id', specFieldId)
      .eq('category_id', categoryId); // Ensure the field belongs to the current category

    if (dbError) {
      // Unique constraint for field_label on update (if field_name is immutable)
      if (dbError.code === '23505' && dbError.message.includes('field_label')) {
         return fail(400, { action: 'updateSpecField', specFieldId, errors: { field_label: ['This field label already exists for this category.'] }, fields: rawData, message: 'Field label already exists.' });
      }
      return fail(500, { action: 'updateSpecField', specFieldId, message: `Database error updating specification field: ${dbError.message}`, fields: rawData });
    }
    return { success: true, action: 'updateSpecField', specFieldId, message: 'Specification field updated successfully.' };
  },

  deleteSpecField: async ({ locals, params, url }) => {
    const categoryId = params.categoryId; // Ensure it's for the correct category
    const specFieldId = url.searchParams.get('specFieldId');
    if (!specFieldId) return fail(400, { action: 'deleteSpecField', message: 'Specification Field ID is missing.' });

    // Future check: Verify if this specField.field_name is used in any product.specifications for this category.
    // This would require querying the products table, filtering by category_id, and checking the JSONB specifications.
    // For example (conceptual, actual query might be more complex or done via a DB function):
    // const { data: productsWithSpec, error: checkError } = await locals.supabase
    //   .from('products')
    //   .select('id')
    //   .eq('category_id', categoryId)
    //   .filter(`specifications->>${specFieldName}`, 'isnot', null) // Check if the key exists
    //   .limit(1);
    // if (checkError) { /* handle error */ }
    // if (productsWithSpec && productsWithSpec.length > 0) {
    //   return fail(400, { action: 'deleteSpecField', message: 'Cannot delete: This field is in use by products.'});
    // }


    const { error: dbError } = await locals.supabase.from('category_specification_fields')
      .delete()
      .eq('id', specFieldId)
      .eq('category_id', categoryId);

    if (dbError) {
      return fail(500, { action: 'deleteSpecField', message: `Database error deleting specification field: ${dbError.message}` });
    }
    // No redirect, page will reload/invalidate data.
    return { success: true, action: 'deleteSpecField', message: 'Specification field deleted successfully.' };
  }
};
