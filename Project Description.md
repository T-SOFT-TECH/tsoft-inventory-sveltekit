# Project Summary: Inventory and Invoice Management System (SvelteKit + Supabase)

## 1. Project Overview

*   **Purpose:** A modern, web-based inventory and invoice management system designed for small to medium-sized businesses. The system must feature a **highly performant, fast, and responsive user interface.** It will allow users to manage products (with dynamic, category-specific attributes), track inventory levels, process sales, generate invoices, manage customer data, and view basic analytics.
*   **Key Technologies:**
    *   **Frontend:** **Latest SvelteKit version with full TypeScript support.** Styling will be implemented using **Tailwind CSS.**
    *   **Backend:** Supabase (PostgreSQL Database, Auth, Edge Functions, Storage, Realtime)

## 2. Core Entities and Database Schema (Supabase)

Supabase will be used for the database, leveraging its PostgreSQL capabilities and built-in Auth.

*   **`users` (Supabase Auth)**
    *   Managed by Supabase Auth. Contains user ID, email, encrypted password, roles (via `auth.users.role` or custom claims in JWT).
*   **`profiles`** (Public table to store non-sensitive user data, linked to `auth.users`)
    *   `id` (uuid, references `auth.users.id`) - Primary Key
    *   `username` (text, unique)
    *   `full_name` (text)
    *   `avatar_url` (text, nullable)
    *   `updated_at` (timestamp with time zone)
*   **`categories`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `name` (text, unique, not null)
    *   `description` (text, nullable)
    *   `parent_id` (uuid, references `categories.id` on delete set null, nullable) - Foreign Key: Establishes hierarchical structure (e.g., "Electronics" -> "Computers"). Allows categories to have sub-categories.
    *   `created_at` (timestamp with time zone, default `now()`)
    *   `updated_at` (timestamp with time zone, default `now()`)
    *   **Note on Hierarchical Categories:** The `parent_id` allows for nesting categories. Fetching category trees or products within a category and its sub-categories might involve recursive queries (e.g., using Common Table Expressions - CTEs in PostgreSQL) on the backend or client-side data manipulation. Supabase's PostgREST API can query views, so a view using recursive CTEs could simplify fetching hierarchical data.
*   **`category_specification_fields`** (Defines the structure of dynamic fields for each category)
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `category_id` (uuid, references `categories.id` on delete cascade) - Foreign Key, Not Null
    *   `field_label` (text, not null, e.g., "Screen Size", "Material")
    *   `field_name` (text, not null, e.g., "screen_size", "material", used as key in JSONB)
    *   `field_type` (text, not null, e.g., "text", "number", "select", "checkbox", "date")
    *   `options` (jsonb, nullable, for "select" or "radio" types, e.g., `["Small", "Medium", "Large"]`)
    *   `is_required` (boolean, default `false`)
    *   `display_order` (integer, default `0`, for ordering fields in forms)
    *   `created_at` (timestamp with time zone, default `now()`)
    *   `unique (category_id, field_name)`
*   **`brands`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `name` (text, unique, not null)
    *   `logo_url` (text, nullable)
    *   `created_at` (timestamp with time zone, default `now()`)
*   **`products`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `name` (text, not null)
    *   `description` (text, nullable)
    *   `sku` (text, unique, not null, Stock Keeping Unit)
    *   `category_id` (uuid, references `categories.id` on delete set null) - Foreign Key
    *   `brand_id` (uuid, references `brands.id` on delete set null) - Foreign Key
    *   `purchase_price` (decimal, nullable)
    *   `selling_price` (decimal, not null)
    *   `current_stock` (integer, not null, default `0`)
    *   `image_urls` (jsonb, nullable, array of text URLs for product images from Supabase Storage)
    *   `specifications` (jsonb, nullable, stores key-value pairs for dynamic product attributes, e.g., `{"screen_size": "15 inch", "ram": "16GB"}`)
    *   `created_at` (timestamp with time zone, default `now()`)
    *   `updated_at` (timestamp with time zone, default `now()`)
*   **`customers`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `name` (text, not null)
    *   `email` (text, unique, nullable)
    *   `phone` (text, nullable)
    *   `address_line1` (text, nullable)
    *   `address_line2` (text, nullable)
    *   `city` (text, nullable)
    *   `postal_code` (text, nullable)
    *   `country` (text, nullable)
    *   `created_at` (timestamp with time zone, default `now()`)
*   **`sales`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `sale_date` (timestamp with time zone, default `now()`)
    *   `customer_id` (uuid, references `customers.id` on delete set null) - Foreign Key
    *   `user_id` (uuid, references `auth.users.id` on delete set null, cashier/staff who made the sale) - Foreign Key
    *   `total_amount` (decimal, not null)
    *   `discount_amount` (decimal, default `0`)
    *   `tax_amount` (decimal, default `0`)
    *   `final_amount` (decimal, not null, `total_amount - discount_amount + tax_amount`)
    *   `payment_method` (text, nullable, e.g., "cash", "card", "online")
    *   `payment_transaction_id` (text, nullable, from payment gateway)
    *   `notes` (text, nullable)
    *   `created_at` (timestamp with time zone, default `now()`)
*   **`sale_items`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `sale_id` (uuid, references `sales.id` on delete cascade) - Foreign Key, Not Null
    *   `product_id` (uuid, references `products.id` on delete restrict) - Foreign Key, Not Null
    *   `quantity` (integer, not null, default `1`)
    *   `unit_price_at_sale` (decimal, not null, price of product when sold)
    *   `total_price_for_item` (decimal, not null, `quantity * unit_price_at_sale`)
*   **`stock_transactions`** (Logs all changes to product stock)
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key
    *   `product_id` (uuid, references `products.id` on delete cascade) - Foreign Key, Not Null
    *   `transaction_type` (text, not null, e.g., `initial_stock`, `sale`, `return`, `adjustment_in`, `adjustment_out`, `damage`)
    *   `quantity_change` (integer, not null, positive for increase, negative for decrease)
    *   `transaction_date` (timestamp with time zone, default `now()`)
    *   `related_sale_id` (uuid, references `sales.id` on delete set null, nullable) - Foreign Key
    *   `notes` (text, nullable)
*   **`invoices`**
    *   `id` (uuid, default `gen_random_uuid()`) - Primary Key (could also be a sequence-based invoice number)
    *   `sale_id` (uuid, references `sales.id` on delete cascade, unique) - Foreign Key, Not Null
    *   `invoice_number` (text, unique, not null, can be generated)
    *   `issue_date` (date, default `current_date`)
    *   `due_date` (date, nullable)
    *   `status` (text, default `'unpaid'`, e.g., `unpaid`, `paid`, `overdue`, `cancelled`)
    *   `pdf_url` (text, nullable, link to generated PDF in Supabase Storage)
    *   `company_details_snapshot` (jsonb, company info from `settings` at time of generation)
    *   `customer_details_snapshot` (jsonb, customer info at time of generation)
    *   `created_at` (timestamp with time zone, default `now()`)
*   **`settings`** (Singleton table for application-wide settings, use RLS to ensure only one row or specific ID)
    *   `id` (integer, primary key, default `1`, `CHECK (id = 1)`)
    *   `company_name` (text, not null)
    *   `company_address` (text)
    *   `company_email` (text)
    *   `company_phone` (text)
    *   `company_logo_url` (text, nullable)
    *   `default_currency_symbol` (text, default `'$'`)
    *   `default_tax_rate_percentage` (decimal, default `0`)
    *   `invoice_footer_text` (text)
    *   `updated_at` (timestamp with time zone, default `now()`)

**Dynamic Product Specifications:**
A product's dynamic specifications are defined by its category. The `category_specification_fields` table stores the *definitions* of these fields for each category (e.g., Category "Laptops" has fields like "RAM Type", "Storage Type", "Screen Resolution"). When a product is created or edited, these definitions are used to render the appropriate form fields. The actual *values* for these specifications (e.g., "RAM Type: DDR4", "Storage Type: SSD") are stored in the `products.specifications` JSONB column as a key-value map (e.g., `{"ram_type": "DDR4", "storage_type": "SSD"}`). The `field_name` from `category_specification_fields` is used as the key in the JSONB object.

## 3. User Roles and Permissions (Supabase RLS)

Supabase's Row Level Security (RLS) will be the primary mechanism for data protection.

*   **Roles:**
    *   `public` (anonymous users): Very limited access, perhaps only to view a login page.
    *   `authenticated` (any logged-in user): Base level of access for logged-in users.
    *   `sales_staff`: Can manage sales, customers, view products, and their own sales history.
    *   `admin`: Full access to all data, including managing users, settings, categories, products, and all administrative functions.
        (Roles can be stored in `auth.users.role` or a custom `user_roles` table and referenced in RLS policies using `auth.jwt() ->> 'role'`).

*   **RLS Policies Examples:**
    *   **`profiles`:** Users can only update their own profile. Admins can update any.
        ```sql
        -- Allow users to select their own profile
        CREATE POLICY "Users can select their own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);
        -- Allow users to update their own profile
        CREATE POLICY "Users can update their own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
        ```
    *   **`products`:** `public` or `authenticated` might have read-only access. `sales_staff` might also have read-only. `admin` has full CRUD.
        ```sql
        -- Admins can do anything
        CREATE POLICY "Admin full access on products" ON products
        FOR ALL USING (get_my_claim('user_role')::text = 'admin'); -- Assuming get_my_claim is a helper
        -- Authenticated users can view products
        CREATE POLICY "Authenticated can view products" ON products
        FOR SELECT TO authenticated USING (true);
        ```
    *   **`sales`:** `sales_staff` can create sales and view their own sales. `admin` can view all sales.
        ```sql
        -- Sales staff can create sales
        CREATE POLICY "Sales staff can create sales" ON sales
        FOR INSERT TO authenticated WITH CHECK (get_my_claim('user_role')::text IN ('sales_staff', 'admin') AND user_id = auth.uid());
        -- Sales staff can view their own sales
        CREATE POLICY "Sales staff can view their own sales" ON sales
        FOR SELECT TO authenticated USING (get_my_claim('user_role')::text = 'admin' OR (get_my_claim('user_role')::text = 'sales_staff' AND user_id = auth.uid()));
        ```
    *   **`category_specification_fields`:** Only `admin` can manage these.
    *   **`settings`:** Only `admin` can update. All `authenticated` users might read some settings (e.g., company name for display).

RLS policies will be defined for all tables and operations (SELECT, INSERT, UPDATE, DELETE).

## 4. API Strategy (Supabase Edge Functions / PostgREST)

*   **PostgREST API (with RLS):**
    *   Used for most direct CRUD operations on tables where RLS policies are sufficient for authorization and data integrity.
    *   Examples:
        *   Fetching product lists (filtered by RLS).
        *   Fetching categories, brands.
        *   Simple customer data updates by authorized users.
        *   Admin fetching lists of users, sales, etc.
        *   Frontend directly subscribes to table changes for real-time updates (e.g., stock level) where appropriate.
*   **Supabase Edge Functions (Deno - TypeScript):**
    *   Used for operations requiring complex business logic, multi-step transactions, data validation beyond RLS, integrations with third-party services, or operations that need elevated privileges securely.
    *   Key Edge Functions:
        *   **`define-category-spec-fields`:**
            *   Purpose: Admin function to create, update, or delete `category_specification_fields` for a category. Ensures proper validation and ordering.
            *   Input: `category_id`, array of field definitions.
            *   Output: Success/failure status.
        *   **`create-product-with-specs`:**
            *   Purpose: Admin function to create a new product, including validating and saving its dynamic `specifications` JSONB based on the category's defined fields. Handles image uploads to Supabase Storage.
            *   Input: Product data (name, sku, category_id, etc.), specifications object, image files.
            *   Output: Created product object or error.
        *   **`update-product-with-specs`:**
            *   Purpose: Similar to create, but for updating existing products and their specifications.
            *   Input: `product_id`, updated product data, updated specifications object.
            *   Output: Updated product object or error.
        *   **`process-sale`:**
            *   Purpose: Handles the entire sales process within a database transaction.
            *   Input: `customer_id`, array of `sale_items` (product_id, quantity), `payment_method`, `discount_amount`, `tax_amount`.
            *   Logic:
                1.  Validate inputs (e.g., product availability).
                2.  Check `current_stock` for each product.
                3.  Create `sales` record.
                4.  Create `sale_items` records.
                5.  Decrement `current_stock` in `products` table for each item sold.
                6.  Create `stock_transactions` log for each item sold.
                7.  (Placeholder: Interact with payment gateway API).
                8.  Generate `invoice_number` and create `invoices` record.
            *   Output: `sale_id`, `invoice_id`, success/failure status.
        *   **`generate-invoice-pdf`:**
            *   Purpose: Generates a PDF for a given invoice using data from `invoices`, `sales`, `sale_items`, `customers`, and `settings`. Stores PDF in Supabase Storage and updates `invoices.pdf_url`.
            *   Input: `invoice_id`.
            *   Output: PDF URL or error.
        *   **`send-invoice-email`:**
            *   Purpose: Sends the generated invoice PDF to the customer's email. Uses Supabase's built-in email sending or a third-party email service.
            *   Input: `invoice_id`, `customer_email` (or fetches from customer record).
            *   Output: Success/failure status.
        *   **`get-sales-analytics`:**
            *   Purpose: Aggregates sales data for reporting (e.g., total sales in a period, top-selling products).
            *   Input: Date range, grouping parameters.
            *   Output: Analytics data object.
        *   **`get-inventory-summary`:**
            *   Purpose: Provides summaries of inventory, such as low stock items or stock valuation.
            *   Input: Filters (e.g., category).
            *   Output: Inventory summary data.

## 5. Frontend Structure (SvelteKit)

*   **Key SvelteKit Routes/Pages (`src/routes`):**
    *   `/` (Public): Landing page or redirects to login/dashboard.
    *   `/auth`:
        *   `/auth/login`: Login page.
        *   `/auth/register`: Registration page.
        *   `/auth/forgot-password`: Forgot password page.
        *   `/auth/update-password`: Update password page (after reset link).
    *   `/app` (Authenticated users, layout with navbar/sidebar):
        *   `/app/dashboard`: Overview dashboard.
        *   `/app/pos`: Point of Sale interface.
        *   `/app/products`: View product listings.
        *   `/app/products/[id]`: View single product details.
        *   `/app/customers`: List and manage customers.
        *   `/app/customers/[id]`: Customer details and sales history.
        *   `/app/sales`: List sales transactions.
        *   `/app/sales/[id]`: View sale details.
        *   `/app/invoices`: List invoices.
        *   `/app/invoices/[id]`: View invoice details (and link to PDF).
        *   `/app/profile`: User profile management.
    *   `/app/admin` (Admin-only area, inherits `/app` layout, additional RLS/guards):
        *   `/app/admin/categories`: Manage categories (CRUD).
        *   `/app/admin/categories/[id]/specs`: Manage specification fields for a category.
        *   `/app/admin/brands`: Manage brands (CRUD).
        *   `/app/admin/products`: Manage products (CRUD, including dynamic specs).
        *   `/app/admin/products/new`: Create new product.
        *   `/app/admin/products/[id]/edit`: Edit product.
        *   `/app/admin/inventory`: Manage stock (adjustments, view transactions).
        *   `/app/admin/users`: Manage users (view, roles - if implemented).
        *   `/app/admin/settings`: Application-wide settings.
        *   `/app/admin/analytics`: View detailed analytics and reports.
*   **Major Svelte Components (`src/lib/components`):**
    *   **Shared:** `Navbar.svelte`, `Sidebar.svelte`, `Button.svelte`, `Modal.svelte`, `Table.svelte`, `FormField.svelte`, `Spinner.svelte`, `NotificationToast.svelte`.
    *   **Auth:** `LoginForm.svelte`, `RegisterForm.svelte`.
    *   **Products:** `ProductCard.svelte`, `ProductList.svelte`, `ProductFilter.svelte`, `ProductForm.svelte` (handles dynamic spec rendering).
    *   **Categories Admin:** `CategoryForm.svelte`, `CategorySpecFieldBuilder.svelte` (for defining spec fields for a category).
    *   **POS:** `PosTerminal.svelte`, `CartDisplay.svelte`, `ProductSelector.svelte`, `PaymentModal.svelte`.
    *   **Invoices:** `InvoiceView.svelte`, `InvoiceList.svelte`.
    *   **Customers:** `CustomerForm.svelte`, `CustomerList.svelte`.
*   **State Management:**
    *   Primarily Svelte Stores (`writable`, `readable`, `derived`) for managing UI state, user session, shopping cart, etc.
    *   Supabase client will be initialized and made available through context or a store.
    *   SvelteKit's page stores (`$page.data`) for route-specific data.
    *   Realtime subscriptions from Supabase will update stores directly.
*   **Styling:**
    *   **Styling:** The primary styling methodology for the SvelteKit application will be **Tailwind CSS.** This utility-first CSS framework will be used for building the user interface components, ensuring rapid development and a consistent design system. Custom Svelte components will encapsulate Tailwind classes for reusability and maintainability.

## 6. Dynamic Category Specification Management (Detailed)

This is a core feature of the system.

1.  **Admin UI for Defining Spec Fields (`/app/admin/categories/[id]/specs`):**
    *   An admin selects a category to manage its specification fields.
    *   The UI (`CategorySpecFieldBuilder.svelte`) allows admins to:
        *   Add new fields by specifying:
            *   `field_label` (e.g., "Screen Size")
            *   `field_name` (auto-generated or editable, e.g., "screen_size") - This becomes the JSON key.
            *   `field_type` (dropdown: text, number, select, checkbox, date).
            *   `options` (if "select", a way to input options like "Option1,Option2").
            *   `is_required` (checkbox).
            *   `display_order` (number input or drag-and-drop to reorder).
        *   Edit existing fields for the category.
        *   Delete fields.
    *   Changes are saved by calling the `define-category-spec-fields` Edge Function.
2.  **Storage of Definitions:**
    *   The definitions are stored in the `category_specification_fields` table, linked to the `categories` table.
3.  **Dynamic Rendering of Product Forms (`ProductForm.svelte`):**
    *   When an admin creates or edits a product (`/app/admin/products/new` or `.../[id]/edit`):
        *   The form first requires selecting a category for the product.
        *   Once a category is selected, the SvelteKit frontend fetches the `category_specification_fields` for that category from Supabase (using PostgREST with RLS).
        *   `ProductForm.svelte` iterates over these field definitions and dynamically renders the appropriate HTML input elements (e.g., `<input type="text">`, `<input type="number">`, `<select>`, etc.).
        *   Labels, placeholders, options (for select), and required attributes are set based on the fetched definitions.
        *   If editing an existing product, the form is pre-filled with values from the `products.specifications` JSONB column.
4.  **Storage of Actual Product Spec Values:**
    *   When the product form is submitted, the values from these dynamically generated fields are collected into a JavaScript object.
    *   This object (e.g., `{"screen_size": "15 inch", "ram": "16GB", "color": "Silver"}`) is then saved into the `products.specifications` JSONB column.
    *   The `create-product-with-specs` or `update-product-with-specs` Edge Function handles this, potentially validating the submitted spec values against the category's definitions.

## 7. Data Flow for Key Operations

*   **Admin Defining/Updating Category Specification Fields:**
    1.  **Admin UI:** Admin navigates to category specs page, modifies fields.
    2.  **SvelteKit Frontend:** On save, collects field definitions array.
    3.  **API Call:** Invokes `define-category-spec-fields` Supabase Edge Function with `category_id` and definitions.
    4.  **Edge Function:**
        *   Authenticates user as admin.
        *   Validates input.
        *   Performs CRUD operations on `category_specification_fields` table within a transaction.
    5.  **Response:** Returns success/error to frontend. Frontend updates UI.
*   **Creating/Editing a Product (Including Dynamic Specifications):**
    1.  **Admin UI:** Admin opens `ProductForm.svelte`. Selects category.
    2.  **SvelteKit Frontend:** Fetches `category_specification_fields` for the selected category. Dynamically renders spec form fields. Admin fills basic product info and dynamic specs. Uploads images.
    3.  **Image Upload:** Images are uploaded directly to Supabase Storage from the client, returning an array of URLs.
    4.  **API Call:** On submit, frontend invokes `create-product-with-specs` (or `update-product-with-specs`) Edge Function with product data, specifications object, and image URLs.
    5.  **Edge Function:**
        *   Authenticates user as admin.
        *   Validates all inputs, including ensuring submitted spec keys are valid for the category.
        *   Creates/updates the record in the `products` table, storing the specs in the `specifications` JSONB column and image URLs in `image_urls`.
        *   If creating with initial stock, creates an `initial_stock` entry in `stock_transactions`.
    6.  **Response:** Returns new/updated product data or error. Frontend navigates or shows message.
*   **Processing a Sale:**
    1.  **User UI (`PosTerminal.svelte`):** Staff adds products to cart.
    2.  **SvelteKit Frontend:** Manages cart state (Svelte store). Fetches product details (including `current_stock`) for display.
    3.  **Checkout:** Staff finalizes cart, selects customer, enters payment details (placeholder).
    4.  **API Call:** Frontend invokes `process-sale` Supabase Edge Function with sale details.
    5.  **Edge Function (`process-sale`):**
        *   Authenticates user (`sales_staff` or `admin`).
        *   Starts a database transaction.
        *   Validates product availability (checks `current_stock`).
        *   Creates `sales` record.
        *   Creates `sale_items` records.
        *   Decrements `current_stock` in `products` for each item.
        *   Creates `stock_transactions` for each item.
        *   (Placeholder: Interacts with payment gateway API. If fails, transaction rolls back).
        *   Generates `invoice_number` and creates `invoices` record.
        *   Commits transaction.
    6.  **Response:** Returns `sale_id`, `invoice_id`, status.
    7.  **SvelteKit Frontend:** Shows success message. Optionally triggers `generate-invoice-pdf` and `send-invoice-email` Edge Function calls. Clears cart.

## 8. Development and Build Process (SvelteKit & Supabase)

*   **Local Development Setup:**
    *   **SvelteKit Frontend - Project Setup:** Initialize the project using the **latest stable version of SvelteKit (`npm create svelte@latest ...`) with full TypeScript support selected during setup.** Run `npm run dev` for the SvelteKit development server with HMR.
    *   **Supabase:**
        *   Install Supabase CLI: `npm install supabase --save-dev`.
        *   Initialize Supabase local development environment: `supabase init`.
        *   Start local Supabase services: `supabase start`. This provides a local PostgreSQL instance, Supabase Studio, local Auth, Storage, and Edge Functions emulator.
        *   Link project: `supabase link --project-ref <your-project-ref>` (when ready to connect to hosted Supabase).
*   **Schema Management:**
    *   Database schema changes are managed using Supabase migrations.
    *   Create new migration: `supabase migration new <migration_name>`.
    *   Edit the generated SQL file in `supabase/migrations/`.
    *   Apply migrations locally: `supabase db reset` (for fresh start) or apply new ones.
    *   Apply migrations to linked Supabase project: `supabase db push`.
*   **Building and Deploying SvelteKit Frontend:**
    *   Build: `npm run build`. This generates optimized static assets or server-rendered code depending on the SvelteKit adapter used (e.g., `adapter-static`, `adapter-node`, `adapter-vercel`).
    *   Deploy: Deploy the output from the build step to a hosting provider (e.g., Vercel, Netlify, Cloudflare Pages for static; or a Node.js server).
*   **Deploying Supabase Schema and Edge Functions:**
    *   Schema: `supabase db push` (as mentioned above).
    *   Edge Functions: `supabase functions deploy <function_name>` or `supabase functions deploy --all`.
*   **CI/CD Considerations:**
    *   Use GitHub Actions, GitLab CI, or other CI/CD tools.
    *   Workflow:
        1.  On push/merge to main branch.
        2.  Lint and test SvelteKit code.
        3.  Build SvelteKit frontend.
        4.  Deploy frontend to hosting.
        5.  Apply Supabase migrations (`supabase db push --linked`). (Careful with production data, review migrations).
        6.  Deploy Supabase Edge Functions (`supabase functions deploy --all --linked`).

## 9. Key Considerations for Developer

*   **Security First:**
    *   Thoroughly implement and test Supabase Row Level Security (RLS) policies for all tables and operations.
    *   Validate all inputs rigorously in Supabase Edge Functions, especially data coming from the client, even if RLS is in place.
    *   Securely manage API keys and secrets for third-party services (e.g., payment gateway, email service) using Supabase Edge Function secrets.
*   **Transaction Management:**
    *   Wrap multi-step database operations within Edge Functions in explicit PostgreSQL transactions (e.g., using `BEGIN; ... COMMIT;` or Supabase client's transaction helpers if available in Deno client) to ensure data integrity (e.g., `process-sale` function).
*   **JSONB Querying:**
    *   While flexible, querying data within JSONB columns (`products.specifications`) can be less performant than querying indexed relational columns if not done carefully.
    *   Use appropriate JSONB operators and indexing (GIN indexes) if frequent filtering or searching based on dynamic specifications is required. For most cases where specs are displayed on product detail pages or used with a known product, direct fetching will be fine.
*   **Payment Gateway Integration:**
    *   This is a critical placeholder. A specific payment gateway (e.g., Stripe, PayPal) needs to be chosen.
    *   Client-side integration for tokenizing payment information (e.g., Stripe Elements).
    *   Server-side integration (within an Edge Function like `process-sale`) for processing payments using the token, handling webhooks for asynchronous payment confirmations.
*   **Error Handling and User Feedback:**
    *   Implement comprehensive error handling in both SvelteKit frontend (try/catch for API calls, form validation) and Supabase Edge Functions.
    *   Provide clear, user-friendly feedback messages (toasts, inline errors) for all operations (success, failure, validation errors).
*   **Scalability of Dynamic Specs:**
    *   The current approach of fetching all spec definitions for a category and rendering is fine for typical numbers of fields. If a category could have hundreds of spec fields (unlikely for this domain), further optimization might be needed.
*   **Realtime Features:**
    *   Leverage Supabase Realtime for features like live stock updates in the POS or notifications for new orders for admins, if desired.
*   **Database Functions and Triggers (PostgreSQL):**
    *   Consider using PostgreSQL functions and triggers for database-level logic where appropriate (e.g., automatically updating `updated_at` timestamps, complex data validation that must always occur at DB level). Supabase allows defining these in migrations.
*   **Tailwind CSS Optimization:**
    *   Ensure Tailwind CSS is configured to purge unused styles in production builds (typically handled by SvelteKit's adapter or Tailwind's JIT engine configuration in `tailwind.config.cjs`). This is crucial for keeping the final CSS bundle size small and performant. Encourage creating reusable Svelte components that encapsulate common Tailwind utility patterns to improve maintainability and reduce class string repetition in markup.
*   **SvelteKit Performance Best Practices:**
    *   Utilize SvelteKit's `load` functions in `+page.server.js` or `+layout.server.js` to fetch data efficiently. Leverage SvelteKit's automatic route-based code splitting. Be mindful of large components or libraries that could be dynamically imported. Optimize Svelte component rendering (reactive statements, keyed `{#each}` blocks). Design for responsiveness from the start. Implement strategies for serving optimized images.

This document should provide a solid foundation for a developer to start building the Inventory and Invoice Management System using SvelteKit and Supabase.
