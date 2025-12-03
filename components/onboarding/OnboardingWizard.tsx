'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Target,
  Bell,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface OnboardingWizardProps {
  locale: 'en' | 'es';
  onComplete: () => void;
}

const interests = [
  { id: 'llm', icon: '🤖', label_en: 'Large Language Models', label_es: 'Modelos de Lenguaje' },
  { id: 'vision', icon: '👁️', label_en: 'Computer Vision', label_es: 'Visión por Computadora' },
  { id: 'robotics', icon: '🦾', label_en: 'Robotics', label_es: 'Robótica' },
  { id: 'ethics', icon: '⚖️', label_en: 'AI Ethics', label_es: 'Ética de IA' },
  { id: 'research', icon: '🔬', label_en: 'Research', label_es: 'Investigación' },
  { id: 'startups', icon: '🚀', label_en: 'AI Startups', label_es: 'Startups de IA' },
  { id: 'tools', icon: '🛠️', label_en: 'AI Tools', label_es: 'Herramientas IA' },
  { id: 'education', icon: '📚', label_en: 'Education', label_es: 'Educación' },
];

export function OnboardingWizard({ locale, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(true);

  const t = locale === 'en' ? {
    welcome: 'Welcome to ThotNet Core!',
    welcomeSubtitle: 'Your AI knowledge hub',
    step1Title: 'What interests you?',
    step1Subtitle: 'Select your topics to personalize your feed',
    step2Title: 'Stay Updated',
    step2Subtitle: 'Get notified about new content',
    enableNotifications: 'Enable Notifications',
    notificationsDesc: 'Get alerts for trending AI news and course updates',
    step3Title: 'All Set!',
    step3Subtitle: 'Your personalized AI experience awaits',
    next: 'Next',
    back: 'Back',
    finish: 'Get Started',
    skip: 'Skip',
    selectMin: 'Select at least 3 topics',
  } : {
    welcome: '¡Bienvenido a ThotNet Core!',
    welcomeSubtitle: 'Tu hub de conocimiento en IA',
    step1Title: '¿Qué te interesa?',
    step1Subtitle: 'Selecciona tus temas para personalizar tu feed',
    step2Title: 'Mantente Actualizado',
    step2Subtitle: 'Recibe notificaciones sobre contenido nuevo',
    enableNotifications: 'Activar Notificaciones',
    notificationsDesc: 'Recibe alertas sobre noticias y cursos de IA',
    step3Title: '¡Todo Listo!',
    step3Subtitle: 'Tu experiencia personalizada de IA te espera',
    next: 'Siguiente',
    back: 'Atrás',
    finish: 'Comenzar',
    skip: 'Omitir',
    selectMin: 'Selecciona al menos 3 temas',
  };

  const handleInterestToggle = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    // Save preferences to backend
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: selectedInterests,
          notifications,
        }),
      });
      
      onComplete();
    } catch (error) {
      console.error('Onboarding save error:', error);
      onComplete(); // Still complete even if save fails
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-3xl mx-4 p-8 rounded-3xl bg-gradient-to-br from-background to-background/50 border border-white/10 shadow-2xl"
      >
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-8 bg-primary'
                  : s < step
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome & Interests */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{t.welcome}</span>
                </div>
                <h2 className="text-4xl font-bold mb-2">{t.step1Title}</h2>
                <p className="text-muted-foreground">{t.step1Subtitle}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {interests.map((interest) => (
                  <motion.button
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-6 rounded-2xl text-center transition-all ${
                      selectedInterests.includes(interest.id)
                        ? 'bg-primary text-white border-2 border-primary'
                        : 'bg-white/5 border-2 border-white/10 hover:border-primary/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{interest.icon}</div>
                    <div className="text-sm font-medium">
                      {locale === 'en' ? interest.label_en : interest.label_es}
                    </div>
                  </motion.button>
                ))}
              </div>

              {selectedInterests.length > 0 && selectedInterests.length < 3 && (
                <p className="text-sm text-amber-400 text-center">
                  {t.selectMin}
                </p>
              )}
            </motion.div>
          )}

          {/* Step 2: Notifications */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/20">
                  <Bell className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{t.step2Title}</span>
                </div>
                <h2 className="text-4xl font-bold mb-2">{t.step2Title}</h2>
                <p className="text-muted-foreground">{t.step2Subtitle}</p>
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-full p-8 rounded-3xl text-center transition-all ${
                    notifications
                      ? 'bg-primary text-white border-2 border-primary'
                      : 'bg-white/5 border-2 border-white/10 hover:border-primary/50'
                  }`}
                >
                  <Bell className={`h-16 w-16 mx-auto mb-4 ${notifications ? 'animate-bounce' : ''}`} />
                  <h3 className="text-xl font-bold mb-2">{t.enableNotifications}</h3>
                  <p className="text-sm opacity-80">{t.notificationsDesc}</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Completion */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-green-500/20"
                >
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-300">{t.step3Title}</span>
                </motion.div>
                
                <h2 className="text-4xl font-bold mb-2">{t.step3Title}</h2>
                <p className="text-muted-foreground mb-8">{t.step3Subtitle}</p>

                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Target className="h-6 w-6 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">
                          {selectedInterests.length} {locale === 'en' ? 'topics selected' : 'temas seleccionados'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {locale === 'en' ? 'Personalized feed active' : 'Feed personalizado activo'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Bell className="h-6 w-6 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">
                          {locale === 'en' ? 'Notifications' : 'Notificaciones'}: {notifications ? '✓' : '✗'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {locale === 'en' ? 'Stay updated with AI news' : 'Mantente al día con noticias IA'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="ghost"
            onClick={onComplete}
            className="text-muted-foreground"
          >
            {t.skip}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && selectedInterests.length < 3}
            >
              {t.next}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish}>
              {t.finish}
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
