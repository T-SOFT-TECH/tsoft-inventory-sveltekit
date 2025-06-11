// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Import Supabase types. Prefer types from '@supabase/supabase-js' as they are foundational.
// Auth helpers might re-export these or have their own, but direct Supabase types are generally safe.
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types'; // Assuming this will be generated

declare global {
  namespace App {
    interface Error {
      message: string; // Ensure error objects have a message property
      code?: string;    // Optional: for error codes
      details?: string; // Optional: for more details
    }
    interface Locals {
      supabase: SupabaseClient<Database>; // Typed Supabase client
      getSession(): Promise<Session | null>;
      session: Session | null;
      user: User | null;
    }
    interface PageData {
      session?: Session | null; // Make session available in page data if needed globally
      // You can add other global page data properties here
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
