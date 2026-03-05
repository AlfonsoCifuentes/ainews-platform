import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';

const OnboardingSchema = z.object({
  interests: z.array(z.string().max(100)).min(1).max(20),
});

export async function GET() {
  return Response.json({ message: 'Onboarding API' });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { interests } = OnboardingSchema.parse(body);

    const userId = user.id;

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
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Onboarding API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
