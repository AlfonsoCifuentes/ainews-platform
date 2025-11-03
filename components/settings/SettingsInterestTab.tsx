'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { InterestSelector } from '@/components/onboarding/InterestSelector';
import { getSupabaseClient } from '@/lib/db/supabase';
import { useToast } from '@/components/shared/ToastProvider';
import { Button } from '@/components/ui/button';

interface SettingsInterestTabProps {
  locale: 'en' | 'es';
  userId: string;
  initialInterests: string[];
}

export function SettingsInterestTab({
  locale,
  userId,
  initialInterests
}: SettingsInterestTabProps) {
  const { showToast } = useToast();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSelectionChange = (interests: string[]) => {
    setSelectedInterests(interests);
    setHasChanges(
      JSON.stringify(interests.sort()) !== JSON.stringify(initialInterests.sort())
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      // Delete all existing interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', userId);

      // Insert new interests
      if (selectedInterests.length > 0) {
        const interestsToInsert = selectedInterests.map(interest => ({
          user_id: userId,
          interest,
        }));

        const { error } = await supabase
          .from('user_interests')
          .insert(interestsToInsert);

        if (error) throw error;
      }

      showToast(
        locale === 'en' 
          ? 'Preferences saved successfully!' 
          : '¡Preferencias guardadas exitosamente!',
        'success'
      );

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving interests:', error);
      showToast(
        locale === 'en' 
          ? 'Failed to save preferences' 
          : 'Error al guardar preferencias',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedInterests(initialInterests);
    setHasChanges(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {locale === 'en' ? 'Your Interests' : 'Tus Intereses'}
        </h2>
        <p className="text-muted-foreground">
          {locale === 'en' 
            ? 'Select topics to personalize your news feed and course recommendations' 
            : 'Selecciona temas para personalizar tu feed de noticias y recomendaciones de cursos'}
        </p>
      </div>

      <InterestSelector
        locale={locale}
        selectedInterests={selectedInterests}
        onSelectionChange={handleSelectionChange}
        variant="settings"
        showContinue={false}
      />

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 justify-end p-6 rounded-2xl bg-card/50 backdrop-blur-sm border"
        >
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
          >
            {locale === 'en' ? 'Reset' : 'Restablecer'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading 
              ? (locale === 'en' ? 'Saving...' : 'Guardando...') 
              : (locale === 'en' ? 'Save Changes' : 'Guardar Cambios')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
