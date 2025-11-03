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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('[Profile] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: profile });
    
  } catch (error) {
    console.error('[Profile] Unexpected error:', error);
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
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
      console.error('[Profile] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      data: updatedProfile 
    });
    
  } catch (error) {
    console.error('[Profile] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
