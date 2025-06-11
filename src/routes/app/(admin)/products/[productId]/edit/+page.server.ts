import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // RouteParams is implicitly available via params
import { z } from 'zod';

// Zod schemas for validation (can be shared with 'new' page, perhaps in a utils file)
const requiredString = z.string().min(1, { message: "is required" });
const optionalString = z.string().optional();
const requiredNumber = z.number().min(0, { message: "must be a positive number" });
const optionalNumber = z.number().min(0).optional().nullable(); // Allow null for optional numbers
const requiredUUID = z.string().uuid({ message: "selection is required" });

const productUpdateSchema = z.object({
  name: requiredString,
  sku: requiredString,
  description: optionalString.nullable(),
  category_id: requiredUUID,
  brand_id: requiredUUID,
  purchase_price: optionalNumber,
  selling_price: requiredNumber,
  current_stock: z.number().int().min(0, { message: "must be a non-negative integer" }),
  image_urls: optionalString.nullable(),
  specifications: optionalString.nullable(),
});

export const load: PageServerLoad = async ({ locals, params }) => {
  const { productId } = params;

  const fetchProduct = async () => {
    const { data, error: productErr } = await locals.supabase
      .from('products')
      .select(`
        *,
        categories (id, name),
        brands (id, name)
      `)
      .eq('id', productId)
      .single();
    if (productErr || !data) throw error(404, `Product not found: ${productErr?.message || 'No product with this ID.'}`);
    return data;
  };

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
    const [product, categories, brands] = await Promise.all([
      fetchProduct(),
      fetchCategories(),
      fetchBrands(),
    ]);

    return { product, categories, brands };
  } catch (err: any) {
    console.error("Error in load function for edit product page:", err);
    throw error(err.status || 500, err.body || { message: 'Failed to load data for product editing' });
  }
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const { productId } = params;
    const formData = await request.formData();
    const fields = Object.fromEntries(formData.entries());

    // Fetch existing product for stock comparison and to fill non-submitted optional fields if needed
    const { data: existingProduct, error: fetchError } = await locals.supabase
        .from('products')
        .select('sku, current_stock')
        .eq('id', productId)
        .single();

    if (fetchError || !existingProduct) {
        return fail(500, { fields, message: 'Could not retrieve existing product data for update.' });
    }

    const dataToValidate = {
      ...fields,
      purchase_price: fields.purchase_price ? parseFloat(fields.purchase_price as string) : null, // Allow null
      selling_price: fields.selling_price ? parseFloat(fields.selling_price as string) : undefined, // Required
      current_stock: fields.current_stock ? parseInt(fields.current_stock as string, 10) : undefined, // Required
    };

    const validationResult = productUpdateSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return fail(400, { fields, errors, message: 'Validation failed. Please check the errors.' });
    }

    const validatedData = validationResult.data;
    const newCurrentStock = validatedData.current_stock;

    let imageUrlsArray: string[] | null = null;
    if (validatedData.image_urls) {
      imageUrlsArray = validatedData.image_urls.split(',').map(url => url.trim()).filter(url => url);
      if (imageUrlsArray.length === 0) imageUrlsArray = null;
    }

    let specificationsObject: Record<string, any> | null = null;
    if (validatedData.specifications) {
      try {
        specificationsObject = JSON.parse(validatedData.specifications);
      } catch (e) {
        return fail(400, { fields, errors: { specifications: ['Invalid JSON format.'] }, message: 'Specifications field contains invalid JSON.' });
      }
    }

    const productDataToUpdate = {
      name: validatedData.name,
      sku: validatedData.sku,
      description: validatedData.description || null,
      category_id: validatedData.category_id,
      brand_id: validatedData.brand_id,
      purchase_price: validatedData.purchase_price, // Already number or null
      selling_price: validatedData.selling_price,   // Already number
      current_stock: newCurrentStock,               // New stock level
      image_urls: imageUrlsArray,
      specifications: specificationsObject,
      updated_at: new Date().toISOString(),
    };

    // --- Database Operations ---
    // 1. Update 'products' table
    const { error: productUpdateError } = await locals.supabase
      .from('products')
      .update(productDataToUpdate)
      .eq('id', productId);

    if (productUpdateError) {
      console.error('Product Update Error:', productUpdateError);
      let specificErrorMessage = `Failed to update product: ${productUpdateError.message}`;
      // Check for unique SKU violation, ONLY if SKU was changed
      if (productUpdateError.code === '23505' && productUpdateError.message.includes('sku') && validatedData.sku !== existingProduct.sku) {
        specificErrorMessage = 'A product with this SKU already exists.';
        return fail(400, { fields, errors: { sku: [specificErrorMessage] }, message: specificErrorMessage });
      }
      return fail(500, { fields, errors: { _general: [specificErrorMessage] }, message: specificErrorMessage });
    }

    // 2. Handle Stock Transaction if stock changed
    const stockDifference = newCurrentStock - existingProduct.current_stock;
    if (stockDifference !== 0) {
      const stockData = {
        product_id: productId,
        transaction_type: 'manual_adjustment', // Or 'stock_update', 'admin_edit'
        quantity_change: stockDifference,
        notes: 'Stock updated via admin edit form.',
        // user_id: locals.user?.id,
      };
      const { error: stockInsertError } = await locals.supabase
        .from('stock_transactions')
        .insert(stockData);

      if (stockInsertError) {
        console.error(`Product ${productId} updated, but stock transaction failed: ${stockInsertError.message}`);
        throw redirect(303, `/app/admin/products?message=Product '${validatedData.name}' updated, but stock adjustment failed. Please verify stock for SKU ${validatedData.sku}.`);
      }
    }

    throw redirect(303, `/app/admin/products?message=Product '${validatedData.name}' updated successfully`);
  },
};
