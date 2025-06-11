import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod'; // Using Zod for validation example

// Define Zod schemas for validation
const requiredString = z.string().min(1, { message: "is required" });
const optionalString = z.string().optional();
const requiredNumber = z.number().min(0, { message: "must be a positive number" });
const optionalNumber = z.number().min(0).optional();
const requiredUUID = z.string().uuid({ message: "selection is required" });

const productSchema = z.object({
  name: requiredString,
  sku: requiredString,
  description: optionalString.nullable(), // Allow null
  category_id: requiredUUID,
  brand_id: requiredUUID,
  purchase_price: optionalNumber.nullable(), // Allow null
  selling_price: requiredNumber,
  current_stock: z.number().int().min(0, { message: "must be a non-negative integer" }),
  image_urls_str: optionalString.nullable(), // Renamed to avoid conflict, will be parsed
  // `specifications` is no longer a single string field from the form for Zod, it's built dynamically
});

export const load: PageServerLoad = async ({ locals }) => {
  const fetchCategories = async () => {
    const { data, error: dbError } = await locals.supabase.from('categories').select('id, name').order('name');
    if (dbError) throw error(500, `Loading categories failed: ${dbError.message}`);
    return data ?? [];
  };

  const fetchBrands = async () => {
    const { data, error: dbError } = await locals.supabase.from('brands').select('id, name').order('name');
    if (dbError) throw error(500, `Loading brands failed: ${dbError.message}`);
    return data ?? [];
  };

  try {
    const [categories, brands] = await Promise.all([fetchCategories(), fetchBrands()]);
    return { categories, brands };
  } catch (err: any) {
    // err should be a SvelteKit error object if thrown by `error()`
    console.error("Error in load function for new product page:", err);
    throw error(err.status || 500, err.body || { message: 'Failed to load data for product creation' });
  }
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const rawFormFields = Object.fromEntries(formData.entries());

    // Fetch category specification definitions for validation
    const categoryId = rawFormFields.category_id as string;
    let categorySpecDefinitions: { field_name: string; field_label: string; field_type: string; is_required: boolean }[] = [];
    if (categoryId) {
        const { data: specs, error: specError } = await locals.supabase
            .from('category_specification_fields')
            .select('field_name, field_label, field_type, is_required')
            .eq('category_id', categoryId);
        if (specError) {
            return fail(500, { fields: rawFormFields, message: `Error fetching category specifications for validation: ${specError.message}` });
        }
        categorySpecDefinitions = specs ?? [];
    }

    // Prepare fixed fields for Zod validation
    const fixedFieldsToValidate = {
      name: rawFormFields.name,
      sku: rawFormFields.sku,
      description: rawFormFields.description,
      category_id: rawFormFields.category_id,
      brand_id: rawFormFields.brand_id,
      purchase_price: rawFormFields.purchase_price ? parseFloat(rawFormFields.purchase_price as string) : null,
      selling_price: rawFormFields.selling_price ? parseFloat(rawFormFields.selling_price as string) : undefined, // undefined if empty for required check
      current_stock: rawFormFields.current_stock ? parseInt(rawFormFields.current_stock as string, 10) : undefined,
      image_urls_str: rawFormFields.image_urls, // Keep as string for Zod, parse later
    };

    const validationResult = productSchema.safeParse(fixedFieldsToValidate);
    let allErrors: Record<string, string[]> = {};

    if (!validationResult.success) {
      allErrors = validationResult.error.flatten().fieldErrors;
    }

    const validatedFixedData = validationResult.success ? validationResult.data : null;

    // Collect and validate dynamic specification values
    let dynamicSpecifications: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('spec_')) {
            const fieldName = key.substring(5);
            const specDef = categorySpecDefinitions.find(def => def.field_name === fieldName);

            if (specDef) {
                let parsedValue: any = value;
                if (specDef.field_type === 'checkbox') {
                    parsedValue = value === 'on' || value === 'true' || value === true;
                } else if (specDef.field_type === 'number') {
                    const numVal = parseFloat(value as string);
                    if (value && isNaN(numVal)) { // Check if value exists and is not a valid number
                        allErrors[key] = [`${specDef.field_label} must be a valid number.`];
                    }
                    parsedValue = !value && value !== '0' ? null : (isNaN(numVal) ? null : numVal); // store null if empty or invalid, else number
                } else if (specDef.field_type === 'boolean') { // Example for a true/false select or radio
                    parsedValue = value === 'true' ? true : (value === 'false' ? false : null);
                } else {
                     parsedValue = (value as string)?.trim() || null;
                }
                dynamicSpecifications[fieldName] = parsedValue;

                if (specDef.is_required && (parsedValue === null || parsedValue === '' || parsedValue === false)) {
                    allErrors[key] = [`${specDef.field_label} is required.`];
                }
            }
        }
    }

    if (Object.keys(allErrors).length > 0) {
        return fail(400, {
            fields: rawFormFields, // Send back original string fields for repopulation
            errors: allErrors,
            message: 'Validation failed. Please check all fields, including category-specific ones.',
        });
    }

    // This block assumes validatedFixedData is not null because Object.keys(allErrors).length === 0
    // If Zod failed but dynamic spec errors also exist, validatedFixedData would be null.
    // A more robust check: if (!validatedFixedData) return fail(...) for fixed field errors first.
    if (!validatedFixedData) {
         return fail(400, { fields: rawFormFields, errors: allErrors, message: 'Validation failed on core product fields.' });
    }

    let imageUrlsArray: string[] | null = null;
    if (validatedFixedData.image_urls_str) {
      imageUrlsArray = validatedFixedData.image_urls_str.split(',').map(url => url.trim()).filter(url => url);
      if (imageUrlsArray.length === 0) imageUrlsArray = null;
    }

    const productDataForDb = {
      name: validatedFixedData.name,
      sku: validatedFixedData.sku,
      description: validatedFixedData.description || null,
      category_id: validatedFixedData.category_id,
      brand_id: validatedFixedData.brand_id,
      purchase_price: validatedFixedData.purchase_price,
      selling_price: validatedFixedData.selling_price,
      current_stock: validatedFixedData.current_stock,
      image_urls: imageUrlsArray,
      specifications: dynamicSpecifications, // Add collected dynamic specifications
      // user_id: locals.user?.id,
    };

    // --- Database Operations ---
    // 1. Insert into 'products'
    const { data: newProduct, error: productInsertError } = await locals.supabase
      .from('products')
      .insert(productDataForDb)
      .select() // Important to get the ID of the new product
      .single();

    if (productInsertError) {
      console.error('Product Insert Error:', productInsertError);
      let specificErrorMessage = `Failed to create product: ${productInsertError.message}`;
      if (productInsertError.code === '23505' && productInsertError.message.includes('sku')) { // Check for unique SKU violation
        specificErrorMessage = 'A product with this SKU already exists.';
        return fail(400, { fields, errors: { sku: [specificErrorMessage] }, message: specificErrorMessage });
      }
      return fail(500, { fields, errors: { _general: [specificErrorMessage] }, message: specificErrorMessage });
    }

    if (!newProduct) {
      return fail(500, { fields, errors: { _general: ['Product created but no data returned.'] }, message: 'Product created but no data returned from database.' });
    }

    // 2. Insert into 'stock_transactions'
    if (validatedData.current_stock > 0) { // Only if initial stock is positive
        const stockData = {
            product_id: newProduct.id,
            transaction_type: 'initial_stock',
            quantity_change: validatedData.current_stock, // Already an int from Zod
            notes: 'Initial stock set during product creation.',
            // user_id: locals.user?.id, // If tracking who initiated
        };
        const { error: stockInsertError } = await locals.supabase
            .from('stock_transactions')
            .insert(stockData);

        if (stockInsertError) {
            console.error(`Critical: Product ${newProduct.id} created, but initial stock transaction failed: ${stockInsertError.message}`);
            // Redirect with a warning message that product was created but stock might be off.
            // This is a compromise as there's no easy client-side transaction rollback.
            throw redirect(303, `/app/admin/products?message=Product '${newProduct.name}' created, but initial stock update failed. Please verify stock for SKU ${newProduct.sku}.`);
        }
    }

    throw redirect(303, `/app/admin/products?message=Product '${newProduct.name}' created successfully`);
  },
};
