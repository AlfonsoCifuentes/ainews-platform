'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Zap, Brain, Cpu, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Interest {
  id: string;
  name_en: string;
  name_es: string;
  icon: typeof Brain;
  description_en: string;
  description_es: string;
  category: 'technology' | 'application' | 'industry' | 'research';
  color: string;
}

export const AVAILABLE_INTERESTS: Interest[] = [
  // Technology
  {
    id: 'machine-learning',
    name_en: 'Machine Learning',
    name_es: 'Aprendizaje Automático',
    icon: Brain,
    description_en: 'Neural networks, deep learning, and AI training',
    description_es: 'Redes neuronales, aprendizaje profundo y entrenamiento de IA',
    category: 'technology',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'natural-language-processing',
    name_en: 'Natural Language Processing',
    name_es: 'Procesamiento del Lenguaje Natural',
    icon: Sparkles,
    description_en: 'ChatGPT, LLMs, text generation, and language models',
    description_es: 'ChatGPT, LLMs, generación de texto y modelos de lenguaje',
    category: 'technology',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'computer-vision',
    name_en: 'Computer Vision',
    name_es: 'Visión por Computadora',
    icon: Cpu,
    description_en: 'Image recognition, object detection, and visual AI',
    description_es: 'Reconocimiento de imágenes, detección de objetos e IA visual',
    category: 'technology',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'generative-ai',
    name_en: 'Generative AI',
    name_es: 'IA Generativa',
    icon: Zap,
    description_en: 'DALL-E, Midjourney, Stable Diffusion, and AI art',
    description_es: 'DALL-E, Midjourney, Stable Diffusion y arte con IA',
    category: 'technology',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'robotics',
    name_en: 'Robotics & Automation',
    name_es: 'Robótica y Automatización',
    icon: Rocket,
    description_en: 'Autonomous systems, drones, and physical AI',
    description_es: 'Sistemas autónomos, drones e IA física',
    category: 'technology',
    color: 'from-indigo-500 to-blue-500'
  },
  
  // Applications
  {
    id: 'ai-safety',
    name_en: 'AI Safety & Ethics',
    name_es: 'Seguridad y Ética de la IA',
    icon: Brain,
    description_en: 'Alignment, bias, and responsible AI development',
    description_es: 'Alineamiento, sesgos y desarrollo responsable de IA',
    category: 'research',
    color: 'from-red-500 to-rose-500'
  },
  {
    id: 'ai-healthcare',
    name_en: 'AI in Healthcare',
    name_es: 'IA en Salud',
    icon: Sparkles,
    description_en: 'Medical diagnosis, drug discovery, and health AI',
    description_es: 'Diagnóstico médico, descubrimiento de fármacos e IA médica',
    category: 'industry',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    id: 'ai-business',
    name_en: 'AI for Business',
    name_es: 'IA para Negocios',
    icon: Zap,
    description_en: 'Productivity, automation, and enterprise AI',
    description_es: 'Productividad, automatización e IA empresarial',
    category: 'application',
    color: 'from-amber-500 to-yellow-500'
  },
  {
    id: 'ai-education',
    name_en: 'AI in Education',
    name_es: 'IA en Educación',
    icon: Brain,
    description_en: 'Personalized learning, tutoring, and edtech AI',
    description_es: 'Aprendizaje personalizado, tutoría e IA educativa',
    category: 'industry',
    color: 'from-violet-500 to-purple-500'
  },
  {
    id: 'ai-research',
    name_en: 'AI Research & Papers',
    name_es: 'Investigación y Papers de IA',
    icon: Rocket,
    description_en: 'Latest papers, breakthroughs, and academic AI',
    description_es: 'Últimos papers, avances e IA académica',
    category: 'research',
    color: 'from-slate-500 to-gray-500'
  },
  
  // Industry
  {
    id: 'ai-coding',
    name_en: 'AI for Coding',
    name_es: 'IA para Programación',
    icon: Cpu,
    description_en: 'GitHub Copilot, code generation, and dev tools',
    description_es: 'GitHub Copilot, generación de código y herramientas dev',
    category: 'application',
    color: 'from-sky-500 to-blue-500'
  },
  {
    id: 'ai-startups',
    name_en: 'AI Startups & News',
    name_es: 'Startups y Noticias de IA',
    icon: Sparkles,
    description_en: 'New companies, funding, and industry news',
    description_es: 'Nuevas empresas, financiación y noticias del sector',
    category: 'industry',
    color: 'from-fuchsia-500 to-pink-500'
  },
];

interface InterestSelectorProps {
  locale: 'en' | 'es';
  selectedInterests: string[];
  onSelectionChange: (interests: string[]) => void;
  onComplete?: () => void;
  variant?: 'onboarding' | 'settings';
  showContinue?: boolean;
}

export function InterestSelector({
  locale,
  selectedInterests,
  onSelectionChange,
  onComplete,
  variant = 'onboarding',
  showContinue = true
}: InterestSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = {
    all: locale === 'en' ? 'All Topics' : 'Todos los Temas',
    technology: locale === 'en' ? 'Technology' : 'Tecnología',
    application: locale === 'en' ? 'Applications' : 'Aplicaciones',
    industry: locale === 'en' ? 'Industry' : 'Industria',
    research: locale === 'en' ? 'Research' : 'Investigación',
  };

  const filteredInterests = selectedCategory && selectedCategory !== 'all'
    ? AVAILABLE_INTERESTS.filter(i => i.category === selectedCategory)
    : AVAILABLE_INTERESTS;

  const toggleInterest = (interestId: string) => {
    startTransition(() => {
      const newSelection = selectedInterests.includes(interestId)
        ? selectedInterests.filter(id => id !== interestId)
        : [...selectedInterests, interestId];
      
      onSelectionChange(newSelection);
    });
  };

  const handleContinue = () => {
    if (onComplete && selectedInterests.length > 0) {
      onComplete();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header */}
      {variant === 'onboarding' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                         bg-gradient-to-r from-primary/10 to-primary/5 
                         border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {locale === 'en' ? 'Step 2 of 2' : 'Paso 2 de 2'}
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold">
            {locale === 'en' 
              ? 'What interests you most?' 
              : '¿Qué te interesa más?'}
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {locale === 'en'
              ? 'Select your favorite AI topics to get personalized content recommendations'
              : 'Selecciona tus temas favoritos de IA para recibir recomendaciones personalizadas'}
          </p>
        </motion.div>
      )}

      {/* Category Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 justify-center"
      >
        {Object.entries(categories).map(([key, label]) => (
          <Button
            key={key}
            variant={selectedCategory === key || (selectedCategory === null && key === 'all') ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(key === 'all' ? null : key)}
            className="rounded-full"
          >
            {label}
          </Button>
        ))}
      </motion.div>

      {/* Interest Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredInterests.map((interest, index) => {
            const isSelected = selectedInterests.includes(interest.id);
            const Icon = interest.icon;
            
            return (
              <motion.button
                key={interest.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => toggleInterest(interest.id)}
                disabled={isPending}
                className={cn(
                  'group relative p-6 rounded-2xl border-2 transition-all duration-300',
                  'hover:scale-105 hover:shadow-xl',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-gradient-to-br ' + interest.color + ' text-white shadow-lg'
                    : 'border-border bg-card/50 backdrop-blur-sm hover:border-primary/50'
                )}
              >
                {/* Selection Indicator */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isSelected ? 1 : 0,
                    opacity: isSelected ? 1 : 0
                  }}
                  className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary" />
                </motion.div>

                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors',
                  isSelected
                    ? 'bg-white/20'
                    : 'bg-primary/10 group-hover:bg-primary/20'
                )}>
                  <Icon className={cn(
                    'w-6 h-6',
                    isSelected ? 'text-white' : 'text-primary'
                  )} />
                </div>

                {/* Content */}
                <h3 className={cn(
                  'text-lg font-bold mb-2 text-left',
                  isSelected ? 'text-white' : 'text-foreground'
                )}>
                  {locale === 'en' ? interest.name_en : interest.name_es}
                </h3>
                
                <p className={cn(
                  'text-sm text-left line-clamp-2',
                  isSelected ? 'text-white/90' : 'text-muted-foreground'
                )}>
                  {locale === 'en' ? interest.description_en : interest.description_es}
                </p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Selected Count & Continue */}
      {showContinue && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 
                     p-6 rounded-2xl bg-card/50 backdrop-blur-sm border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {selectedInterests.length}
              </span>
            </div>
            <div className="text-left">
              <p className="font-medium">
                {locale === 'en'
                  ? `${selectedInterests.length} ${selectedInterests.length === 1 ? 'topic' : 'topics'} selected`
                  : `${selectedInterests.length} ${selectedInterests.length === 1 ? 'tema' : 'temas'} seleccionado${selectedInterests.length === 1 ? '' : 's'}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {locale === 'en'
                  ? 'Select at least 1 to continue'
                  : 'Selecciona al menos 1 para continuar'}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleContinue}
            disabled={selectedInterests.length === 0 || isPending}
            className="min-w-[200px] rounded-full"
          >
            {variant === 'onboarding'
              ? (locale === 'en' ? 'Continue' : 'Continuar')
              : (locale === 'en' ? 'Save Preferences' : 'Guardar Preferencias')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
