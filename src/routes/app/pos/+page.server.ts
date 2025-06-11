import { error, fail, redirect } from '@sveltejs/kit'; // Added redirect for auth check
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Auth check - this route is within /app, so /app/+layout.server.ts should protect it.
  // Adding an explicit check here is defense in depth.
  if (!locals.user) {
    // The redirect path should ideally include the original intended URL for after login.
    // However, for a POS page, redirecting to login then back might be okay,
    // or just to a generic dashboard if direct access to POS without session is unusual.
    throw redirect(303, '/auth/login?redirectTo=/app/pos');
  }

  const fetchProducts = async () => {
    const { data: products, error: productsError } = await locals.supabase
      .from('products')
      .select('id, name, sku, selling_price, current_stock, categories (name), brands (name)')
      .order('name', { ascending: true });

    if (productsError) {
      console.error('Error fetching products for POS:', productsError);
      throw error(500, { message: 'Could not fetch products: ' + productsError.message });
    }
    return products ?? [];
  };

  const fetchCustomers = async () => {
    const { data: customers, error: customersError } = await locals.supabase
      .from('customers')
      .select('id, name') // Only fetch what's needed for the dropdown
      .order('name', { ascending: true });

    if (customersError) {
      console.error('Error fetching customers for POS:', customersError);
      throw error(500, { message: 'Could not fetch customers: ' + customersError.message });
    }
    return customers ?? [];
  };

  try {
    const [products, customers] = await Promise.all([
      fetchProducts(),
      fetchCustomers()
    ]);
    return { products, customers };
  } catch (err: any) {
    // If errors are thrown by the fetch functions, they will be SvelteKit error objects
    // This catch block handles any other unexpected errors during Promise.all
    console.error('Error loading data for POS page:', err);
    throw error(err.status || 500, err.body?.message || 'An unexpected error occurred while loading POS data.');
  }
};

export const actions: Actions = {
  processSale: async ({ request, locals }) => {
    // Auth check for the action
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized: You must be logged in to process a sale.'});
    }
    // Further role/permission checks can be added here if needed.

    const formData = await request.formData();
    const customerId = formData.get('customer_id')?.toString();
    const paymentMethod = formData.get('payment_method')?.toString();
    const cartItemsJson = formData.get('cartItemsJson')?.toString();

    // Placeholder for full sale processing logic.
    // This will involve:
    // 1. Parsing cartItemsJson.
    // 2. Validating cart items (e.g., stock availability, prices).
    // 3. Calculating totals.
    // 4. Creating a 'sales' record.
    // 5. Creating 'sale_items' records.
    // 6. Updating 'products.current_stock'.
    // 7. Creating 'stock_transactions'.
    // All these steps should ideally be in a database transaction.

    // --- Form Data Parsing & Basic Validation ---
    if (!cartItemsJson) {
      return fail(400, { message: 'Cart data is missing.' });
    }

    let cartItems: { productId: string; quantity: number; unit_price: number; total_price: number; name: string; sku: string }[];
    try {
      cartItems = JSON.parse(cartItemsJson);
    } catch (e) {
      return fail(400, { message: 'Invalid cart data format.' });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return fail(400, { message: 'Cart is empty or invalid.' });
    }

    const clientSaleTotal = parseFloat(formData.get('saleTotal')?.toString() || '0');
    const serverCalculatedCartTotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    if (Math.abs(clientSaleTotal - serverCalculatedCartTotal) > 0.001) { // Check for floating point discrepancies
      return fail(400, { message: `Cart total mismatch. Client: ${clientSaleTotal}, Server: ${serverCalculatedCartTotal}. Please refresh and try again.` });
    }

    if (!paymentMethod) {
        return fail(400, { message: 'Payment method is required.'});
    }
    // selectedCustomerId can be empty for walk-in customers, so only validate format if present (later if needed)


    // --- Server-Side Stock & Price Validation ---
    const productIds = cartItems.map(item => item.productId);
    const { data: dbProducts, error: productFetchError } = await locals.supabase
      .from('products')
      .select('id, name, selling_price, current_stock')
      .in('id', productIds);

    if (productFetchError) {
      return fail(500, { message: `Error fetching product details for validation: ${productFetchError.message}` });
    }

    for (const cartItem of cartItems) {
      const dbProduct = dbProducts.find(p => p.id === cartItem.productId);
      if (!dbProduct) {
        return fail(409, { message: `Product ${cartItem.name} (${cartItem.sku}) is no longer available. Please remove it from cart and try again.` });
      }
      if (Math.abs(cartItem.unit_price - dbProduct.selling_price) > 0.001) {
        return fail(409, { message: `Price for ${dbProduct.name} has changed from $${cartItem.unit_price.toFixed(2)} to $${dbProduct.selling_price.toFixed(2)}. Please review your cart.` });
      }
      if (cartItem.quantity > dbProduct.current_stock) {
        return fail(409, { message: `Insufficient stock for ${dbProduct.name}. Requested: ${cartItem.quantity}, Available: ${dbProduct.current_stock}.` });
      }
    }

    // --- Database Operations (Sequential - Mark for future transaction enhancement) ---
    // **IMPORTANT**: These operations should ideally be wrapped in a database transaction.
    // Supabase client library itself doesn't offer direct multi-statement transaction control.
    // This typically requires a database function (stored procedure) called via RPC.
    // For now, operations are sequential; if one fails, data can be inconsistent.

    // 1. Create `sales` record
    const saleDataToInsert = {
      user_id: locals.user.id,
      customer_id: customerId || null, // Ensure null if empty string
      total_amount: serverCalculatedCartTotal, // Server calculated total
      final_amount: serverCalculatedCartTotal, // Assuming no discounts/taxes for now
      payment_method: paymentMethod,
      status: 'completed', // Or 'pending_payment' if payment gateway is involved
      // notes: formData.get('sale_notes')?.toString() || null, // Example for additional sale notes
    };

    const { data: saleRecord, error: saleError } = await locals.supabase
      .from('sales')
      .insert(saleDataToInsert)
      .select()
      .single();

    if (saleError || !saleRecord) {
      console.error('Sale Record Insert Error:', saleError);
      return fail(500, { message: `Failed to create sale record: ${saleError?.message || 'No record returned'}` });
    }

    // 2. For each item: create `sale_items`, update `products.current_stock`, create `stock_transactions`
    for (const item of cartItems) {
      // a. Create `sale_items` record
      const { error: saleItemError } = await locals.supabase
        .from('sale_items')
        .insert({
          sale_id: saleRecord.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price_at_sale: item.unit_price,
          total_price_for_item: item.total_price,
        });

      if (saleItemError) {
        console.error(`Failed to insert sale item for product ${item.productId} in sale ${saleRecord.id}:`, saleItemError);
        // CRITICAL: Sale record created, but items not. Requires manual reconciliation or rollback if possible.
        return fail(500, { message: `Sale created (ID: ${saleRecord.id}), but failed to record sale item ${item.name}. Please contact support for reconciliation.` });
      }

      // b. Update `products.current_stock`
      // Fetch current stock again to minimize race conditions, though a DB function is better.
      const dbProductForStock = dbProducts.find(p => p.id === item.productId)!; // Should exist from earlier check
      const newStockLevel = dbProductForStock.current_stock - item.quantity;

      const { error: stockUpdateError } = await locals.supabase
        .from('products')
        .update({ current_stock: newStockLevel, updated_at: new Date().toISOString() })
        .eq('id', item.productId);

      if (stockUpdateError) {
        console.error(`Failed to update stock for product ${item.productId} in sale ${saleRecord.id}:`, stockUpdateError);
        return fail(500, { message: `Sale created (ID: ${saleRecord.id}), items recorded, but failed to update stock for ${item.name}. Please contact support for reconciliation.` });
      }

      // c. Create `stock_transactions` record
      const { error: stockTransactionError } = await locals.supabase
        .from('stock_transactions')
        .insert({
          product_id: item.productId,
          transaction_type: 'sale',
          quantity_change: -item.quantity, // Negative for outgoing stock
          related_sale_id: saleRecord.id,
          notes: `Sale of ${item.quantity} units.`,
          // user_id: locals.user.id, // Optional: user who performed the sale
        });

      if (stockTransactionError) {
        console.error(`Failed to create stock transaction for product ${item.productId} in sale ${saleRecord.id}:`, stockTransactionError);
        return fail(500, { message: `Sale created (ID: ${saleRecord.id}), items and stock updated, but failed to record stock transaction for ${item.name}. Please contact support for reconciliation.` });
      }
    }

    // (Placeholder) Payment Gateway Interaction
    if (paymentMethod !== 'cash') {
      // TODO: Implement payment gateway logic if needed.
      // If payment fails, the sale status might need to be updated to 'payment_failed'.
      // This adds more complexity and underscores the need for transactions.
    }

    // Success
    // Redirect to a sales confirmation page or back to POS with a success message.
    // For now, redirecting back to POS. A dedicated sales detail/confirmation page would be better.
    throw redirect(303, `/app/pos?message=Sale (ID: ${saleRecord.id}) processed successfully!`);
    // Or to a sales detail page:
    // throw redirect(303, `/app/sales/${saleRecord.id}?message=Sale processed successfully`);
    // Or, more likely, a redirect:
    // throw redirect(303, `/app/sales/${newSaleId}?message=Sale successful`);
  },
};
