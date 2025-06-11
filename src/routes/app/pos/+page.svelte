<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';
  import { invalidateAll } from '$app/navigation';

  // Define CartItem interface
  interface CartItem {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unit_price: number; // Price at the time of adding to cart
    stockLimit: number; // Max stock available for this product
    total_price: number;
  }

  let { data, form }: { data: PageData, form?: ActionData } = $props();

  let displayMessage = $state('');
  let products = $derived(data.products); // Products from server load
  let customers = $derived(data.customers);

  let cartItems = $state<CartItem[]>([]);
  let selectedCustomerId = $state('');
  let paymentMethod = $state('cash');
  let searchTerm = $state('');

  // Cart Total (derived from cartItems)
  let cartTotal = $derived(
    cartItems.reduce((sum, item) => sum + item.total_price, 0)
  );

  // Filtered Products (derived from products and searchTerm)
  let filteredProducts = $derived(
    (() => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return products;
      return products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.categories?.name && p.categories.name.toLowerCase().includes(term)) ||
        (p.brands?.name && p.brands.name.toLowerCase().includes(term))
      );
    })()
  );

  $effect(() => {
    let messages: string[] = [];
    if (form?.message) {
      messages.push(`Action: ${form.message}`);
    }
    const urlParams = new URL($page.url.searchParams.toString());
    const urlMessage = urlParams.get('message');

    if (urlMessage) {
      messages.push(urlMessage);
    }
    displayMessage = messages.join('; ');

    if (form?.success || (form?.message && form.message.toLowerCase().includes('success'))) {
      // This will be more relevant when processSale is fully implemented
      // For now, if the placeholder action somehow returns success, we can clear cart.
      // cartItems = [];
      // selectedCustomerId = '';
      // paymentMethod = 'cash';
      // searchTerm = '';
      // invalidateAll(); // To refresh product stock if sale was successful
    }
  });

  function addToCart(product: typeof products[0]) {
    if (product.current_stock <= 0) {
      alert(`${product.name} is out of stock.`);
      return;
    }

    const existingItemIndex = cartItems.findIndex(item => item.productId === product.id);

    if (existingItemIndex > -1) {
      const updatedCart = [...cartItems]; // Create a new array for reactivity
      const item = updatedCart[existingItemIndex];
      if (item.quantity < product.current_stock) {
        item.quantity++;
        item.total_price = item.quantity * item.unit_price;
        cartItems = updatedCart;
      } else {
        alert(`Cannot add more ${product.name}. Stock limit (${product.current_stock}) reached in cart.`);
      }
    } else {
      cartItems = [
        ...cartItems,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku ?? 'N/A',
          quantity: 1,
          unit_price: product.selling_price, // Store price at time of adding
          stockLimit: product.current_stock,
          total_price: product.selling_price,
        }
      ];
    }
  }

  function removeFromCart(productId: string) {
    cartItems = cartItems.filter(item => item.productId !== productId);
  }

  function updateQuantity(productId: string, newQuantityStr: string | number) {
    const newQuantity = typeof newQuantityStr === 'string' ? parseInt(newQuantityStr, 10) : newQuantityStr;
    const itemIndex = cartItems.findIndex(i => i.productId === productId);

    if (itemIndex > -1) {
      const updatedCart = [...cartItems];
      const item = updatedCart[itemIndex];

      if (isNaN(newQuantity) || newQuantity <= 0) {
        // If new quantity is invalid or zero, remove item (or set to 1, depending on desired UX)
        cartItems = updatedCart.filter((_, index) => index !== itemIndex);
        return;
      }

      if (newQuantity <= item.stockLimit) {
        item.quantity = newQuantity;
        item.total_price = item.quantity * item.unit_price;
        cartItems = updatedCart;
      } else {
        alert(`Cannot set quantity for ${item.name} above stock limit (${item.stockLimit}). Setting to max available.`);
        item.quantity = item.stockLimit; // Set to max stock
        item.total_price = item.quantity * item.unit_price;
        cartItems = updatedCart;
      }
    }
  }

  function getCartQuantity(productId: string): number {
    return cartItems.find(ci => ci.productId === productId)?.quantity ?? 0;
  }

</script>

<div class="pos-page p-2 md:p-4 max-h-screen flex flex-col">
  <h1 class="text-xl md:text-2xl font-semibold mb-4 text-center md:text-left">Point of Sale</h1>

  {#if displayMessage}
    <div class="mb-4 p-3 rounded text-sm fixed top-4 right-4 z-50 shadow-lg max-w-md"
         class:bg-green-100={displayMessage.toLowerCase().includes("success")}
         class:text-green-700={displayMessage.toLowerCase().includes("success")}
         class:bg-red-100={!displayMessage.toLowerCase().includes("success") && (displayMessage.toLowerCase().includes("fail") || displayMessage.toLowerCase().includes("error"))}
         class:text-red-700={!displayMessage.toLowerCase().includes("success") && (displayMessage.toLowerCase().includes("fail") || displayMessage.toLowerCase().includes("error"))}
         class:bg-yellow-100={!displayMessage.toLowerCase().includes("success") && !displayMessage.toLowerCase().includes("fail") && !displayMessage.toLowerCase().includes("error")}
         class:text-yellow-700={!displayMessage.toLowerCase().includes("success") && !displayMessage.toLowerCase().includes("fail") && !displayMessage.toLowerCase().includes("error")}>
      {@html displayMessage.replace(/;/g, '<br>')}
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
    <section class="lg:col-span-2 space-y-3 flex flex-col min-h-0">
      <h2 class="text-lg font-medium">Products</h2>
      <input type="search" placeholder="Search products by name, SKU, brand, category..." bind:value={searchTerm} class="input input-bordered w-full text-sm" />
      <div class="product-list flex-grow overflow-y-auto border p-2 space-y-2 bg-gray-50 rounded-md">
        {#if filteredProducts.length > 0}
          {#each filteredProducts as product (product.id)}
            {@const currentCartQuantity = getCartQuantity(product.id)}
            {@const canAddToCart = product.current_stock > 0 && currentCartQuantity < product.current_stock}
            <div class="product-item bg-white p-2.5 border rounded shadow-sm hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-semibold text-sm md:text-base">{product.name} <span class="text-xs text-gray-500">({product.sku})</span></h3>
                  <p class="text-xs text-gray-600">
                    Brand: {product.brands?.name ?? 'N/A'} | Category: {product.categories?.name ?? 'N/A'}
                  </p>
                  <p class="text-xs text-gray-600">
                    Price: <span class="font-medium">${product.selling_price?.toFixed(2) ?? '0.00'}</span> |
                    Stock: <span class="font-medium {product.current_stock > 0 ? 'text-green-600' : 'text-red-600'}">{product.current_stock}</span>
                  </p>
                </div>
                <button
                  class="btn btn-sm btn-primary mt-1 text-xs whitespace-nowrap {canAddToCart ? '' : 'btn-disabled'}"
                  onclick={() => addToCart(product)}"
                  disabled={!canAddToCart}>
                  Add to Cart
                </button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-center text-gray-500 py-10">No products found matching "{searchTerm}".</p>
        {/if}
      </div>
    </section>

    <section class="space-y-3 bg-white p-3 border rounded-md shadow-lg flex flex-col min-h-0">
      <h2 class="text-lg font-medium">Sale Summary</h2>
      <form method="POST" action="?/processSale" use:enhance class="flex flex-col flex-grow space-y-3 min-h-0">
        <div>
          <label for="customer_id" class="label text-sm">Customer</label>
          <select name="customer_id" id="customer_id" bind:value={selectedCustomerId} class="select select-bordered w-full select-sm">
            <option value="">Walk-in Customer</option>
            {#each customers as customer (customer.id)}
              <option value={customer.id}>{customer.name}</option>
            {/each}
          </select>
        </div>

        <div class="cart-items-display border p-2 rounded-md min-h-[10rem] flex-grow overflow-y-auto bg-gray-50 text-sm space-y-1.5">
          {#if cartItems.length === 0}
            <p class="text-gray-500 text-center py-10">Cart is empty</p>
          {:else}
            {#each cartItems as item (item.productId)}
              <div class="cart-item border-b pb-1.5">
                <div class="flex justify-between items-center">
                  <span class="font-medium text-xs md:text-sm">{item.name} ({item.sku})</span>
                  <button type="button" class="text-red-500 hover:text-red-700 text-xs p-1" onclick={() => removeFromCart(item.productId)}>Remove</button>
                </div>
                <div class="flex items-center justify-between text-xs mt-0.5">
                  <span>@ ${item.unit_price.toFixed(2)}</span>
                  <input type="number" value={item.quantity}
                         on:change={(e) => updateQuantity(item.productId, (e.target as HTMLInputElement).value, item.stockLimit)}
                         min="1" max={item.stockLimit}
                         class="input input-xs w-16 text-center border-gray-300" />
                  <span class="font-medium w-20 text-right">${item.total_price.toFixed(2)}</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="font-bold text-lg md:text-xl my-1 text-right">Total: ${cartTotal.toFixed(2)}</div>

        <div>
          <label for="payment_method" class="label text-sm">Payment Method</label>
          <select name="payment_method" id="payment_method" bind:value={paymentMethod} class="select select-bordered w-full select-sm">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
            <option value="other">Other</option>
          </select>
        </div>

        <input type="hidden" name="cartItemsJson" value={JSON.stringify(cartItems)} />
        <input type="hidden" name="saleTotal" value={cartTotal} />

        <button type="submit" class="btn btn-success w-full mt-auto" disabled={cartItems.length === 0}>Process Sale</button>
      </form>
    </section>
  </div>
</div>

<style>
  /* Basic styles - assuming Tailwind is primarily used for styling */
  .pos-page { /* container */ }
  .input, .select { /* Assuming global styles or Tailwind @apply for these */
    border-color: #D1D5DB; /* Tailwind gray-300 */
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem; /* rounded-md */
  }
  .select-sm { font-size: 0.875rem; padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .input-xs { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
  .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;}
  .btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; cursor: pointer; text-align: center; }
  .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
  .btn-primary { background-color: #4F46E5; color: white; }
  .btn-primary:hover { background-color: #4338CA; }
  .btn-success { background-color: #10B981; color: white; }
  .btn-success:hover { background-color: #059669; }
  .btn-disabled { background-color: #D1D5DB; color: #6B7280; cursor: not-allowed; opacity: 0.7; }
  .max-h-screen { max-height: 100vh; }
  .min-h-0 { min-height: 0; } /* Useful for flex children that need to scroll */
  /* Tailwind placeholder classes copied from previous step */
  .p-2 { padding: 0.5rem; } .p-2\.5 { padding: 0.625rem; } .p-3 { padding: 0.75rem; } .p-4 { padding: 1rem; }
  .mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; } .my-1 { margin-top: 0.25rem; margin-bottom: 0.25rem; } .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; } .mt-1 { margin-top: 0.25rem; } .mt-3 { margin-top: 0.75rem; } .mt-auto { margin-top: auto; }
  .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
  .text-xl { font-size: 1.25rem; } .text-lg { font-size: 1.125rem; } .text-sm { font-size: 0.875rem; } .text-xs { font-size: 0.75rem; }
  .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; } .font-bold { font-weight: 700; }
  .text-gray-500 { color: #6B7280; } .text-gray-600 { color: #4B5563; }
  .grid { display: grid; } .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .lg\:grid-cols-3 { @media (min-width: 1024px) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .md\:col-span-2 { @media (min-width: 768px) { grid-column: span 2 / span 2; } }
  .gap-4 { gap: 1rem; }
  .space-y-1\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.375rem; }
  .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
  .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
  .border { border-width: 1px; border-color: #E5E7EB; } .border-b { border-bottom-width: 1px;} .rounded { border-radius: 0.25rem; } .rounded-md { border-radius: 0.375rem; }
  .shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
  .hover\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
  .hover\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
  .cursor-pointer { cursor: pointer; } .whitespace-nowrap { white-space: nowrap; }
  .h-96 { height: 24rem; } .min-h-\[10rem\] { min-height: 10rem; }
  .overflow-y-auto { overflow-y: auto; } .bg-gray-50 { background-color: #F9FAFB; }
  .flex { display: flex; } .flex-col { flex-direction: column; } .flex-grow { flex-grow: 1; }
  .justify-between { justify-content: space-between; } .items-start { align-items: flex-start; } .items-center { align-items: center; }
  .text-green-600 { color: #059669; } .text-red-600 { color: #DC2626; } .text-red-500 { color: #EF4444; } .text-red-700 { color: #B91C1C; }
  .fixed { position: fixed; } .top-4 { top: 1rem; } .right-4 { right: 1rem; } .z-50 { z-index: 50; } .max-w-md { max-width: 28rem; }
  .bg-green-100 { background-color: #dcfce7; } .text-green-700 { color: #15803d; }
  .bg-red-100 { background-color: #fee2e2; }
  .bg-yellow-100 { background-color: #fef9c3; } .text-yellow-700 { color: #a16207; }
  .w-full { width: 100%; } .w-16 { width: 4rem; } .w-20 { width: 5rem; }
  .input-bordered { border-width: 1px; }
  .select-bordered { border-width: 1px; }
  .transition-shadow { transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
</style>
