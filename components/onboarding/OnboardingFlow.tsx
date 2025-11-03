'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { InterestSelector } from './InterestSelector';
import { getSupabaseClient } from '@/lib/db/supabase';
import { useToast } from '@/components/shared/ToastProvider';

interface OnboardingFlowProps {
  locale: 'en' | 'es';
  userId: string;
}

export function OnboardingFlow({ locale, userId }: OnboardingFlowProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (selectedInterests.length === 0) {
      showToast(locale === 'en' 
        ? 'Please select at least one interest' 
        : 'Por favor selecciona al menos un interés',
        'error'
      );
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      // Save user interests
      const interestsToInsert = selectedInterests.map(interestId => ({
        user_id: userId,
        interest: interestId,
      }));

      const { error } = await supabase
        .from('user_interests')
        .insert(interestsToInsert);

      if (error) throw error;

      // Mark onboarding as complete
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      showToast(locale === 'en' 
        ? 'Preferences saved successfully!' 
        : '¡Preferencias guardadas exitosamente!',
        'success'
      );

      // Redirect to personalized feed
      router.push(`/${locale}/news`);
      router.refresh();
    } catch (error) {
      console.error('Error saving interests:', error);
      showToast(locale === 'en' 
        ? 'Failed to save preferences. Please try again.' 
        : 'Error al guardar preferencias. Por favor intenta de nuevo.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <InterestSelector
          locale={locale}
          selectedInterests={selectedInterests}
          onSelectionChange={setSelectedInterests}
          onComplete={handleComplete}
          variant="onboarding"
          showContinue={true}
        />
      </motion.div>

      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-lg font-medium">
              {locale === 'en' ? 'Setting up your experience...' : 'Configurando tu experiencia...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
