import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Get user progress for a course
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const db = getSupabaseServerClient();
    const { id: courseId } = await context.params;
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const { data: progress, error } = await db
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('last_accessed', { ascending: false });
    
    if (error) {
      console.error('[Progress API] Error fetching progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }
    
    // Calculate overall progress
    const totalModules = progress?.length || 0;
    const completedModules = progress?.filter(p => p.completed).length || 0;
    const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        progress: progress || [],
        stats: {
          total_modules: totalModules,
          completed_modules: completedModules,
          progress_percentage: Math.round(progressPercentage),
          last_accessed: progress?.[0]?.last_accessed || null
        }
      }
    });
    
  } catch (error) {
    console.error('[Progress API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Save or update user progress
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const db = getSupabaseServerClient();
    const { id: courseId } = await context.params;
    const body = await req.json();
    
    const { userId, moduleId, completed, score, timeSpent } = body;
    
    if (!userId || !moduleId) {
      return NextResponse.json(
        { success: false, error: 'userId and moduleId are required' },
        { status: 400 }
      );
    }
    
    // Check if progress already exists
    const { data: existing } = await db
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .single();
    
    if (existing) {
      // Update existing progress
      const updates: Record<string, unknown> = {
        last_accessed: new Date().toISOString()
      };
      
      if (completed !== undefined) {
        updates.completed = completed;
        if (completed) {
          updates.completed_at = new Date().toISOString();
        }
      }
      if (score !== undefined) updates.score = score;
      if (timeSpent !== undefined) {
        // Add to existing time spent
        const { data: current } = await db
          .from('user_progress')
          .select('time_spent')
          .eq('id', existing.id)
          .single();
        
        updates.time_spent = (current?.time_spent || 0) + timeSpent;
      }
      
      const { data, error } = await db
        .from('user_progress')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('[Progress API] Update error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update progress' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, data });
      
    } else {
      // Create new progress entry
      const { data, error } = await db
        .from('user_progress')
        .insert({
          user_id: userId,
          course_id: courseId,
          module_id: moduleId,
          completed: completed || false,
          score: score || null,
          time_spent: timeSpent || 0,
          completed_at: completed ? new Date().toISOString() : null
        })
        .select()
        .single();
      
      if (error) {
        console.error('[Progress API] Insert error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create progress' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, data });
    }
    
  } catch (error) {
    console.error('[Progress API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
