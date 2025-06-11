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
  description: optionalString,
  category_id: requiredUUID,
  brand_id: requiredUUID,
  purchase_price: optionalNumber,
  selling_price: requiredNumber,
  current_stock: z.number().int().min(0, { message: "must be a non-negative integer" }),
  image_urls: optionalString, // Will be parsed from comma-separated string
  specifications: optionalString, // Will be parsed from JSON string
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
    const fields = Object.fromEntries(formData.entries());

    // Prepare for Zod (numbers need to be parsed)
    const dataToValidate = {
      ...fields,
      purchase_price: fields.purchase_price ? parseFloat(fields.purchase_price as string) : undefined,
      selling_price: fields.selling_price ? parseFloat(fields.selling_price as string) : undefined,
      current_stock: fields.current_stock ? parseInt(fields.current_stock as string, 10) : undefined,
    };

    const validationResult = productSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return fail(400, {
        fields, // Send back original string fields
        errors,
        message: 'Validation failed. Please check the errors.',
      });
    }

    const validatedData = validationResult.data;

    let imageUrlsArray: string[] | null = null;
    if (validatedData.image_urls) {
      imageUrlsArray = validatedData.image_urls.split(',').map(url => url.trim()).filter(url => url);
      if (imageUrlsArray.length === 0) imageUrlsArray = null; // Ensure empty becomes null
    }

    let specificationsObject: Record<string, any> | null = null;
    if (validatedData.specifications) {
      try {
        specificationsObject = JSON.parse(validatedData.specifications);
      } catch (e) {
        return fail(400, {
          fields,
          errors: { specifications: ['Invalid JSON format.'] },
          message: 'Specifications field contains invalid JSON.',
        });
      }
    }

    const productDataForDb = {
      name: validatedData.name,
      sku: validatedData.sku,
      description: validatedData.description || null,
      category_id: validatedData.category_id,
      brand_id: validatedData.brand_id,
      purchase_price: validatedData.purchase_price, // Already a number or undefined
      selling_price: validatedData.selling_price, // Already a number
      current_stock: validatedData.current_stock, // Already a number
      image_urls: imageUrlsArray,
      specifications: specificationsObject,
      // user_id: locals.user?.id, // If tracking creator
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
