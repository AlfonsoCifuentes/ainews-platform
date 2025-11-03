import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET() {
  return Response.json({ message: 'Onboarding API' });
}

export async function POST(request: Request) {
  try {
    const { userId, interests } = await request.json();

    if (!userId || !Array.isArray(interests) || interests.length === 0) {
      return Response.json(
        { error: 'Invalid request. userId and interests[] required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Insert user interests
    const interestsToInsert = interests.map((interest: string) => ({
      user_id: userId,
      interest,
    }));

    const { error: interestsError } = await supabase
      .from('user_interests')
      .insert(interestsToInsert);

    if (interestsError) {
      console.error('Error inserting interests:', interestsError);
      return Response.json(
        { error: 'Failed to save interests' },
        { status: 500 }
      );
    }

    // Update user profile to mark onboarding as complete
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return Response.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('Onboarding API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
