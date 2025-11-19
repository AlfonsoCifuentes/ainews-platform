/**
 * User Profile API
 * 
 * GET /api/user/profile - Get user profile
 * PATCH /api/user/profile - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  display_name: z.string().min(3).max(30).optional(),
  full_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  preferred_locale: z.enum(['en', 'es']).optional(),
  theme: z.enum(['dark', 'light']).optional()
});

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[API] [Profile GET] User not authenticated', { error: authError?.message });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[API] [Profile GET] Fetching profile for user:', { userId: user.id, email: user.email });
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows found (which is OK, we'll create one)
      console.error('[API] [Profile GET] Error fetching profile:', { code: profileError.code, message: profileError.message });
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    if (profile) {
      console.log('[API] [Profile GET] Profile found in database', { displayName: profile.display_name, id: profile.id });
      return NextResponse.json({ data: profile });
    }

    // No profile found, create one from user metadata
    console.log('[API] [Profile GET] No profile found, creating fallback from OAuth metadata', { userId: user.id });
    const metadata = user.user_metadata ?? {};
    const now = new Date().toISOString();
    
    const newProfile = {
      id: user.id,
      email: user.email,
      display_name: (metadata.name as string | undefined) || 
                    (metadata.full_name as string | undefined) || 
                    (metadata.user_name as string | undefined) || 
                    user.email?.split('@')[0] || 
                    'User',
      full_name: (metadata.name as string | undefined) || 
                 (metadata.full_name as string | undefined) || 
                 null,
      avatar_url: (metadata.avatar_url as string | undefined) || 
                  (metadata.picture as string | undefined) || 
                  null,
      bio: null,
      preferred_locale: (metadata.locale as string | undefined)?.startsWith('es') ? 'es' : 'en',
      theme: 'dark',
      total_xp: 0,
      level: 1,
      streak_days: 0,
      last_activity_at: now,
      email_notifications: true,
      weekly_digest: true,
      created_at: now,
      updated_at: now,
    };
    
    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([newProfile])
      .select('*')
      .single();
    
    if (createError) {
      console.error('[API] [Profile GET] Error creating profile:', { code: createError.code, message: createError.message });
      // Return the in-memory profile anyway
      console.log('[API] [Profile GET] Returning in-memory fallback profile');
      return NextResponse.json({ data: newProfile });
    }

    console.log('[API] [Profile GET] Profile created successfully in database', { displayName: createdProfile?.display_name, id: createdProfile?.id });
    return NextResponse.json({ data: createdProfile || newProfile });
    
  } catch (error) {
    console.error('[API] [Profile GET] Unexpected error:', { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[API] [Profile PATCH] User not authenticated');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[API] [Profile PATCH] Updating profile for user:', { userId: user.id });
    
    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const updates = validationResult.data;
    
    // Check display_name uniqueness if changing display_name
    if (updates.display_name) {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('display_name', updates.display_name)
        .single();
      
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Display name already taken' },
          { status: 409 }
        );
      }
    }
    
    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[API] [Profile PATCH] Error updating profile:', { code: updateError.code, message: updateError.message });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    console.log('[API] [Profile PATCH] Profile updated successfully', { displayName: updatedProfile?.display_name });
    
    return NextResponse.json({ 
      success: true,
      data: updatedProfile 
    });
    
  } catch (error) {
    console.error('[API] [Profile PATCH] Unexpected error:', { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
