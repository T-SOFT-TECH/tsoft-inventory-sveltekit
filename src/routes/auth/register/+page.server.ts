import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
// import { supabase } from '$lib/server/supabase.ts'; // Not directly used if relying on locals.supabase

export const actions: Actions = {
  register: async ({ request, locals }) => { // Changed to 'register' to be explicit, can be 'default'
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const passwordConfirm = formData.get('password_confirm')?.toString();

    // For returning errors and repopulating form
    const returnData = {
      email,
      errors: {} as Record<string, string>,
      message: '',
    };

    // Basic Validations
    if (!email) {
      returnData.errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Simple email format check
        returnData.errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      returnData.errors.password = 'Password is required.';
    } else if (password.length < 6) {
      returnData.errors.password = 'Password must be at least 6 characters long.';
    }
    if (!passwordConfirm) {
      returnData.errors.password_confirm = 'Please confirm your password.';
    } else if (password !== passwordConfirm) {
      returnData.errors.password_confirm = 'Passwords do not match.';
    }

    if (Object.keys(returnData.errors).length > 0) {
      returnData.message = 'Please correct the errors in the form.';
      return fail(400, returnData);
    }

    // Attempt to sign up the user
    const { data, error: signUpError } = await locals.supabase.auth.signUp({
      email: email!, // email and password asserted as non-null due to checks above
      password: password!,
      // options: { emailRedirectTo: `${url.origin}/auth/callback` } // If using email confirmation redirect
    });

    if (signUpError) {
      returnData.message = signUpError.message;
      // Check for specific Supabase errors if needed, e.g., user already exists
      if (signUpError.message.toLowerCase().includes("user already registered")) {
          returnData.errors.email = "This email is already registered. Please try logging in.";
      }
      return fail(400, returnData);
    }

    if (!data.user) {
        // This should ideally not happen if signUpError is null, but as a safeguard:
        returnData.message = "Registration completed, but no user data was returned. Please contact support.";
        return fail(500, returnData);
    }

    // Profile Creation
    const userId = data.user.id;
    // email is asserted non-null here because it passed prior validation
    const username = email!.split('@')[0];

    const { error: profileError } = await locals.supabase
        .from('profiles')
        .insert({
            id: userId,
            username: username,
            // email: email // Optional: if you want to store email in profiles table too
        });

    if (profileError) {
        console.error(`Critical: User ${userId} (email: ${email}) signed up, but profile creation failed: ${profileError.message}`);
        // Inform the user about the partial success and critical failure.
        // It's important they know their auth user was created but profile is missing.
        returnData.message = `User registered successfully, but profile creation failed. Please contact support. (Error code: ${profileError.code})`;
        // Potentially, you might want to clean up the auth user here if profile creation is absolutely critical
        // await locals.supabase.auth.admin.deleteUser(userId); // Requires admin client and careful consideration
        return fail(500, returnData);
    }

    // Redirect to login page with a success message (or a "check your email" page if confirmation is enabled)
    // This redirect now only happens if both auth.user and profile are created successfully.
    throw redirect(303, '/auth/login?message=Registration successful. Please check your email to confirm your account, then log in.');
  },
};
