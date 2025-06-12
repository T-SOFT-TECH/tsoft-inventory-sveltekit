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
  new_product_images: z.array(z.instanceof(File)
    .refine(file => file.size > 0, { message: 'Empty file detected.' })
    .refine(file => file.size < 2 * 1024 * 1024, { message: 'File too large. Max 2MB.' })
    .refine(file => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type), { message: 'Invalid file type.' })
  ).optional().default([]),
  images_to_delete_json: z.string().optional()
    .transform(val => val ? JSON.parse(val) : [])
    .pipe(z.array(z.string().url({ message: "Invalid URL in images_to_delete_json." }))),
  existing_image_urls_json: z.string().optional() // This is mainly for carrying state back to form on error
    .transform(val => val ? JSON.parse(val) : [])
    .pipe(z.array(z.string().url({ message: "Invalid URL in existing_image_urls_json." }))),
  // `specifications` object is built dynamically
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

    let categorySpecDefinitions: any[] = [];
    if (product && product.category_id) {
        const { data: specs, error: specError } = await locals.supabase
            .from('category_specification_fields')
            .select('*') // Select all needed fields for rendering
            .eq('category_id', product.category_id)
            .order('display_order', { ascending: true })
            .order('field_label', { ascending: true });

        if (specError) {
            // Log the error but don't fail the entire page load.
            // The form can still be used for other fields, or category can be changed.
            console.error(`Error fetching spec definitions for category ${product.category_id}: ${specError.message}`);
            // Optionally, you could pass an error message to the client to display
        } else {
            categorySpecDefinitions = specs ?? [];
        }
    }

    return { product, categories, brands, categorySpecDefinitions };
  } catch (err: any) {
    console.error("Error in load function for edit product page:", err);
    throw error(err.status || 500, err.body || { message: 'Failed to load data for product editing' });
  }
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const { productId } = params;
    const formData = await request.formData();
    const rawFormFields = Object.fromEntries(formData.entries());

    // Fetch existing product for stock comparison & original SKU
    const { data: existingProduct, error: fetchError } = await locals.supabase
        .from('products')
        .select('sku, current_stock, category_id') // Also fetch original category_id if needed for complex logic
        .eq('id', productId)
        .single();

    if (fetchError || !existingProduct) {
        return fail(500, { fields: rawFormFields, message: 'Could not retrieve existing product data for update.' });
    }

    // Fetch category specification definitions for validation based on submitted category_id
    const submittedCategoryId = rawFormFields.category_id as string;
    let categorySpecDefinitions: { field_name: string; field_label: string; field_type: string; is_required: boolean }[] = [];
    if (submittedCategoryId) {
        const { data: specs, error: specError } = await locals.supabase
            .from('category_specification_fields')
            .select('field_name, field_label, field_type, is_required')
            .eq('category_id', submittedCategoryId);
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
      category_id: submittedCategoryId,
      brand_id: rawFormFields.brand_id,
      purchase_price: rawFormFields.purchase_price ? parseFloat(rawFormFields.purchase_price as string) : null,
      selling_price: rawFormFields.selling_price ? parseFloat(rawFormFields.selling_price as string) : undefined,
      current_stock: rawFormFields.current_stock ? parseInt(rawFormFields.current_stock as string, 10) : undefined,
      new_product_images: formData.getAll('new_product_images').filter(f => (f as File).size > 0) as File[],
      images_to_delete_json: rawFormFields.images_to_delete_json,
      existing_image_urls_json: rawFormFields.existing_image_urls, // Corrected name from svelte
    };

    const validationResult = productUpdateSchema.safeParse(fixedFieldsToValidate);
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

            if (specDef) { // Only process specs defined for the *selected* category
                let parsedValue: any = value;
                if (specDef.field_type === 'checkbox' || specDef.field_type === 'boolean') {
                    parsedValue = value === 'on' || value === 'true' || value === true;
                } else if (specDef.field_type === 'number') {
                    const numVal = parseFloat(value as string);
                    if (value && isNaN(numVal)) {
                        allErrors[key] = [`${specDef.field_label} must be a valid number.`];
                    }
                    parsedValue = !value && value !== '0' ? null : (isNaN(numVal) ? null : numVal);
                } else {
                     parsedValue = (value as string)?.trim() || null;
                }
                dynamicSpecifications[fieldName] = parsedValue;

                if (specDef.is_required && (parsedValue === null || parsedValue === '' || ( (specDef.field_type === 'checkbox' || specDef.field_type === 'boolean') && parsedValue === false))) {
                    allErrors[key] = [`${specDef.field_label} is required.`];
                }
            }
        }
    }

    if (Object.keys(allErrors).length > 0) {
        return fail(400, {
            fields: rawFormFields,
            errors: allErrors,
            message: 'Validation failed. Please check all fields.',
        });
    }

    if (!validatedFixedData) { // Should be caught by above, but as safeguard
         return fail(400, { fields: rawFormFields, errors: allErrors, message: 'Validation failed on core product fields.' });
    }

    const newCurrentStock = validatedFixedData.current_stock;

    // --- Image Handling ---
    const newImageFiles: File[] = validatedFixedData.new_product_images || [];
    const imagesToDelete: string[] = validatedFixedData.images_to_delete_json || [];
    // existing_image_urls_json from Zod is the list of URLs that were *not* marked for deletion by the user
    // and were submitted back.
    let keptImageUrls: string[] = validatedFixedData.existing_image_urls_json || [];
    const newlyUploadedUrls: string[] = [];

    // 1. Delete images marked for deletion from Storage
    if (imagesToDelete.length > 0) {
        const pathsToDelete = imagesToDelete.map(url => {
            try {
                const urlParts = new URL(url);
                // Assuming URL structure: https://<project>.supabase.co/storage/v1/object/public/product-images/<productId>/<filename>
                // or                                                                             /product-images/<sku>/<filename>
                // The path to delete is everything after 'product-images/'
                const pathSegments = urlParts.pathname.split('/product-images/');
                return pathSegments.length > 1 ? pathSegments[1] : null;
            } catch { return null; }
        }).filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
            const { error: deleteStorageError } = await locals.supabase.storage
                .from('product-images') // Ensure this is your bucket name
                .remove(pathsToDelete);
            if (deleteStorageError) {
                console.error("Failed to delete some product images from storage:", deleteStorageError);
                // Non-fatal, log and continue. The URLs will be removed from DB array.
            }
        }
    }

    // 2. Upload new images
    if (newImageFiles.length > 0) {
        for (const file of newImageFiles) {
            // Zod already did basic validation. Could add more checks here if needed.
            const fileExt = file.name.split('.').pop() || 'bin';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,9)}.${fileExt}`;
            const filePath = `${productId}/${fileName}`; // Store in folder named by product's actual ID

            const { error: uploadError } = await locals.supabase.storage
                .from('product-images')
                .upload(filePath, file, { upsert: false }); // New files, so no upsert needed

            if (uploadError) {
                allErrors['new_product_images'] = (allErrors['new_product_images'] || []).concat(`Failed to upload ${file.name}: ${uploadError.message}`);
                // Continue to attempt other uploads, or fail fast? For now, try all.
            } else {
                const { data: publicUrlData } = locals.supabase.storage.from('product-images').getPublicUrl(filePath);
                if (publicUrlData) {
                    newlyUploadedUrls.push(publicUrlData.publicUrl);
                } else {
                     allErrors['new_product_images'] = (allErrors['new_product_images'] || []).concat(`Failed to get public URL for ${file.name}.`);
                }
            }
        }
        if (allErrors['new_product_images'] && allErrors['new_product_images'].length > 0) {
             return fail(500, { fields: rawFormFields, errors: allErrors, message: 'Some new images failed to upload or process.' });
        }
    }

    // 3. Construct final image_urls array
    const finalImageUrls = [...keptImageUrls, ...newlyUploadedUrls];

    const productDataToUpdate = {
      name: validatedFixedData.name,
      sku: validatedFixedData.sku,
      description: validatedFixedData.description || null,
      category_id: submittedCategoryId,
      brand_id: validatedFixedData.brand_id,
      purchase_price: validatedFixedData.purchase_price,
      selling_price: validatedFixedData.selling_price,
      current_stock: newCurrentStock,
      image_urls: finalImageUrls.length > 0 ? finalImageUrls : null,
      specifications: dynamicSpecifications,
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
