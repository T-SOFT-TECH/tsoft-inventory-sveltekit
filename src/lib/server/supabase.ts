import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from '$lib/database.types'; // Assuming this will be generated later

// Define a generic type for options, if you have specific needs for Database type elsewhere.
// For now, we'll use the SupabaseClientOptions directly.
// type GenericSupabaseClientOptions = SupabaseClientOptions<string>;


// Client for use on the client-side or for server-side operations not requiring elevated privileges
// Explicitly type the client with the Database generic for better type safety
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Options for the admin client
const adminClientOptions: SupabaseClientOptions<string> = { // Using <string> for schema generic here as it's for admin
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};

// Client for admin-level operations on the server
// Explicitly type the admin client with the Database generic
export const supabaseAdmin = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  adminClientOptions
);
