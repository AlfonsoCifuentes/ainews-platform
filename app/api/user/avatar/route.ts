/**
 * Avatar Upload API
 * 
 * POST /api/user/avatar
 * Uploads user avatar with server-side compression (Sharp)
 * Guarantees JPG format ≤100KB, 200x200px
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import sharp from 'sharp';

// Force dynamic rendering to avoid build-time errors with Sharp
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB upload limit
const TARGET_SIZE_KB = 100;
const TARGET_DIMENSIONS = 200;

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Compress image with Sharp
    let quality = 80;
    let compressedBuffer: Buffer | undefined;
    let sizeKB = Infinity;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (sizeKB > TARGET_SIZE_KB && attempts < maxAttempts) {
      compressedBuffer = await sharp(buffer)
        .resize(TARGET_DIMENSIONS, TARGET_DIMENSIONS, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true // Better compression
        })
        .toBuffer();
      
      sizeKB = compressedBuffer.length / 1024;
      
      if (sizeKB > TARGET_SIZE_KB) {
        quality -= 5;
        attempts++;
      } else {
        break;
      }
    }
    
    // If still too large after all attempts, use smallest possible
    if (sizeKB > TARGET_SIZE_KB || !compressedBuffer) {
      compressedBuffer = await sharp(buffer)
        .resize(TARGET_DIMENSIONS, TARGET_DIMENSIONS, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 60,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      sizeKB = compressedBuffer.length / 1024;
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}.jpg`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[Avatar Upload] Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload avatar' },
        { status: 500 }
      );
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('[Avatar Upload] Profile update error:', updateError);
      // Delete uploaded file if profile update fails
      await supabase.storage.from('avatars').remove([fileName]);
      
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    // Delete old avatar if exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    
    if (profile?.avatar_url && profile.avatar_url !== publicUrl) {
      const oldFileName = profile.avatar_url.split('/').pop();
      if (oldFileName) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldFileName}`]);
      }
    }
    
    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      size_kb: Math.round(sizeKB * 10) / 10 // Round to 1 decimal
    });
    
  } catch (error) {
    console.error('[Avatar Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get current avatar
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    
    if (profile?.avatar_url) {
      const fileName = profile.avatar_url.split('/').pop();
      if (fileName) {
        // Delete from storage
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${fileName}`]);
      }
    }
    
    // Update profile to remove avatar
    await supabase
      .from('user_profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Avatar Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
