import { fail, redirect, error } from '@sveltejs/kit'; // Added error for consistency, though not used in this action
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';

// Zod schema for profile update
const profileUpdateSchema = z.object({
  username: z.string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores.' })
    .trim()
    .nullable().optional().or(z.literal(''))
    .transform(val => val === '' ? null : val),
  full_name: z.string().trim().nullable().optional().transform(val => val === '' ? null : val),
  avatar_file: z.instanceof(File).optional()
    .refine(file => !file || file.size === 0 || file.size < 2 * 1024 * 1024, { message: 'Avatar image must be less than 2MB.' })
    .refine(file => !file || file.size === 0 || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type), { message: 'Avatar must be a .jpg, .png, .gif, or .webp file.' }),
  // Note: avatar_url is removed from schema; it's now derived from avatar_file upload
});

export const load: PageServerLoad = async ({ locals, url }) => {
  // The /app/+layout.server.ts should already protect this route and ensure locals.user exists.
  // If locals.user is somehow null here, the parent layout's redirect would have already fired.
  // However, a defense-in-depth check is fine.
  if (!locals.user) {
    throw redirect(303, `/auth/login?redirectTo=${url.pathname}`);
  }

  // locals.user (which is App.User type from app.d.ts) should already include `profile`
  // due to the work done in hooks.server.ts.
  // We pass it explicitly to make the page's data dependency clear.
  // If locals.user.profile is null (e.g., profile creation failed or not yet done),
  // the Svelte page will need to handle this gracefully.
  return {
    // The `user` object from the parent layout (`data.user`) will also contain this profile.
    // Explicitly passing `profile` here can be for clarity or if this page's load
    // might fetch more specific profile details than the hook does. For now, it's the same.
    profile: locals.user.profile ?? null,
    // We don't need to return the full `user` object again if it's identical to what the
    // root app layout provides, unless this page needs to load additional user-specific data
    // not available in the root layout's `data.user`.
    // For simplicity, we'll rely on `data.user` from the parent layout for email, etc.,
    // and `data.profile` from this load function for profile form fields.
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    // Placeholder for profile update logic
    // 1. Get formData: const formData = await request.formData();
    // 2. Get fields: username, full_name, avatar_url
    // 3. Validate data (e.g., Zod schema)
    //    - Username uniqueness (if it can be changed and needs to be unique)
    //    - Avatar URL format
    // 4. Update 'profiles' table: await locals.supabase.from('profiles').update(...).eq('id', locals.user.id)
    // 5. Handle errors, return fail() with messages/errors
    // 6. On success, return { success: true, message: 'Profile updated!' } or redirect
    //    If redirecting, the `load` function might re-fetch or hooks.server.ts might provide updated profile.
    //    If returning data, the page needs to update its state.

    // For now:
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData.entries());

    // Validate form data
    // For Zod to correctly parse File objects from FormData, they must be passed directly.
    // Other fields might need explicit conversion if not string.
    const dataForZod = {
        username: rawData.username,
        full_name: rawData.full_name,
        avatar_file: rawData.avatar_file instanceof File && rawData.avatar_file.size > 0 ? rawData.avatar_file : undefined,
    };
    const validation = profileUpdateSchema.safeParse(dataForZod);

    if (!validation.success) {
      return fail(400, {
        action: 'updateProfile',
        fields: rawData, // Send back raw string data for repopulation of text fields
        errors: validation.error.flatten().fieldErrors,
        message: 'Validation failed. Please check the errors below.',
      });
    }

    const { username, full_name } = validation.data; // avatar_file is handled separately
    const avatarFile = validation.data.avatar_file; // This will be the File object or undefined

    let newAvatarUrl: string | null = locals.user.profile?.avatar_url ?? null; // Keep existing by default
    let oldAvatarPath: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
        // Store the path of the current avatar to potentially delete it after successful upload
        if (locals.user.profile?.avatar_url) {
            try {
                const urlParts = new URL(locals.user.profile.avatar_url);
                // Example path: /storage/v1/object/public/avatars/user_id/avatar.png
                // We need 'user_id/avatar.png' for deletion
                const pathSegments = urlParts.pathname.split('/');
                // Assuming bucket name 'avatars' is at index 4 if path starts with /storage/v1/object/public/
                if (pathSegments.length > 5 && pathSegments[4] === 'avatars') {
                    oldAvatarPath = pathSegments.slice(5).join('/');
                }
            } catch (e) {
                console.error("Could not parse old avatar URL to get path for deletion:", e);
            }
        }

        const fileExt = avatarFile.name.split('.').pop() || 'png'; // Default to png if no extension
        // Use a consistent file name, like 'avatar.ext', to simplify upsert and prevent multiple files per user.
        // Or, use a unique name if versioning or multiple avatars are desired.
        const filePath = `${locals.user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await locals.supabase.storage
            .from('avatars') // Ensure this bucket exists and has appropriate policies
            .upload(filePath, avatarFile, {
                cacheControl: '3600', // Cache for 1 hour
                upsert: true, // Overwrite file if it exists (e.g., user_id/avatar.png)
            });

        if (uploadError) {
            return fail(500, {
                action: 'updateProfile',
                fields: rawData,
                errors: { avatar_file: [uploadError.message] },
                message: `Avatar upload failed: ${uploadError.message}`,
            });
        }

        const { data: publicUrlData } = locals.supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        newAvatarUrl = publicUrlData.publicUrl;

        // Optional: Delete the old avatar if a new one was uploaded and paths differ
        // This is more complex if file extensions change or names are totally unique per upload.
        // With `upsert: true` and a consistent path like `user_id/avatar.ext`, new upload overwrites.
        // If extension changes, old file might remain.
        // For simplicity, direct deletion of oldAvatarPath is not implemented here unless path is known and different.
        // if (oldAvatarPath && oldAvatarPath !== filePath) {
        //    const { error: deleteOldError } = await locals.supabase.storage.from('avatars').remove([oldAvatarPath]);
        //    if (deleteOldError) console.error("Error deleting old avatar:", deleteOldError);
        // }
    }
    // Add logic for a "remove avatar" checkbox if implemented:
    // if (rawData.remove_avatar === 'on') { newAvatarUrl = null; /* also delete from storage */ }


    // Prepare data for DB update
    const profileDataToUpdate: {
      username?: string | null;
      full_name?: string | null;
      avatar_url?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    let changesMade = false;
    // Add fields to update only if they are different from current profile or explicitly provided
    // This check helps in avoiding unnecessary DB updates if form is submitted without changes.
    // Also handles setting to null if user clears an optional field.

    if (username !== undefined && username !== (locals.user.profile?.username ?? null)) {
        profileDataToUpdate.username = username;
        changesMade = true;
    } else if (username === undefined && rawData.username === undefined) {
        // If username was not in form data at all (e.g. disabled field), don't try to set it to null
        // This case might not be needed if all fields are always submitted
    }


    if (full_name !== undefined && full_name !== (locals.user.profile?.full_name ?? null)) {
        profileDataToUpdate.full_name = full_name;
        changesMade = true;
    }
    // Always update avatar_url in DB if a file was processed, even if URL string is same (e.g. due to upsert)
    // or if it was explicitly changed (e.g. removed by user - future feature)
    if (newAvatarUrl !== (locals.user.profile?.avatar_url ?? null) || (avatarFile && avatarFile.size > 0) ) {
        profileDataToUpdate.avatar_url = newAvatarUrl;
        changesMade = true;
    }

    // If only updated_at is set (and no file was processed to change avatar_url), it means no actual profile data changed
    if (!changesMade && Object.keys(profileDataToUpdate).length === 1) {
         return { success: true, action: 'updateProfile', message: 'No changes submitted to profile data.' };
    }

    // Username Uniqueness Check (if username is being changed to a new, non-null value)
    // profileDataToUpdate.username would contain the new username if it's being changed.
    if (profileDataToUpdate.username && profileDataToUpdate.username !== (locals.user.profile?.username ?? null)) {
      const { data: existingUserWithNewUsername, error: usernameCheckError } = await locals.supabase
        .from('profiles')
        .select('id')
        .eq('username', profileDataToUpdate.username)
        .neq('id', locals.user.id) // Exclude current user's profile
        .maybeSingle();

      if (usernameCheckError) {
        return fail(500, {
          action: 'updateProfile',
          fields: rawData,
          message: `Error checking username uniqueness: ${usernameCheckError.message}`,
        });
      }
      if (existingUserWithNewUsername) {
        return fail(400, {
          action: 'updateProfile',
          fields: rawData,
          errors: { username: ['This username is already taken. Please choose another.'] },
          message: 'Username is already taken.',
        });
      }
    }

    // Remove username from update if it wasn't changed (to avoid issues if it's part of unique constraint but not actually modified)
    if (profileDataToUpdate.username === (locals.user.profile?.username ?? null)) {
        delete profileDataToUpdate.username;
    }

    // Only proceed with DB update if there are actual changes beyond just updated_at
    if (Object.keys(profileDataToUpdate).length === 1 && profileDataToUpdate.updated_at) {
        // This case should ideally be caught by the `!changesMade` check earlier if no avatar file was processed.
        // If an avatar was processed but resulted in the same URL, this could still be hit.
        return { success: true, action: 'updateProfile', message: 'Profile data including avatar is already up to date.' };
    }

    const { error: updateError } = await locals.supabase
      .from('profiles')
      .update(profileDataToUpdate)
      .eq('id', locals.user.id);

    if (updateError) {
      // This could catch a unique constraint on username if the above check had a race condition,
      // or other DB errors.
      if (updateError.code === '23505' && updateError.message.includes('username')) {
         return fail(400, { action: 'updateProfile', fields: rawData, errors: { username: ['This username is already taken.'] }, message: 'Username taken.' });
      }
      return fail(500, {
        action: 'updateProfile',
        fields: rawData,
        message: `Failed to update profile: ${updateError.message}`,
      });
    }

    // Important: The hook will re-fetch the profile on the next load/navigation.
    // No need to manually update locals.user.profile here as it won't persist to other requests.
    return { success: true, action: 'updateProfile', message: 'Profile updated successfully!' };
  },

  changePassword: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    // Placeholder for password change logic
    // 1. Get formData: currentPassword, newPassword, confirmNewPassword
    // 2. Validate:
    //    - All fields present
    //    - newPassword === confirmNewPassword
    //    - newPassword meets strength requirements
    // 3. Verify currentPassword: This is tricky with Supabase if you don't want to expose user.update directly
    //    - One way: try `signInWithPassword` with current email and currentPassword. If it succeeds, password is correct.
    //    - Or, if this action is primarily for users who are already logged in, Supabase recommends
    //      `supabase.auth.updateUser({ password: newPassword })` which handles current password verification implicitly
    //      if the user's session is fresh enough or if MFA isn't triggering re-authentication.
    //      However, for explicit current password check, you might need a custom flow or a dedicated endpoint.
    // 4. Update password: `await locals.supabase.auth.updateUser({ password: newPassword });`
    // 5. Handle errors (e.g., weak password, Supabase errors)
    // 6. On success, return { success: true, message: 'Password changed successfully!' } or redirect.

    const formData = await request.formData();
    const newPassword = formData.get('new_password');
    console.log("Attempting to change password for user:", locals.user.id, "to new password (length):", newPassword?.toString().length);

    return fail(501, {
        message: `Password change for user ${locals.user.id} is not fully implemented yet.`
    });
  }
};
