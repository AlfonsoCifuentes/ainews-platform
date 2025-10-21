/**
 * Interactive Article Explainers
 * Expandable concept definitions with visual aids and KG integration
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ConceptExplanation {
  term: string;
  definition: string;
  relatedEntities: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  examples?: string[];
  visualAid?: string; // URL to diagram/image
}

interface InteractiveExplainerProps {
  content: string;
  locale: 'en' | 'es';
  articleId: string;
}

export default function InteractiveExplainer({
  content,
  locale,
  articleId,
}: InteractiveExplainerProps) {
  const [concepts, setConcepts] = useState<Map<string, ConceptExplanation>>(
    new Map()
  );
  const [activeConcept, setActiveConcept] = useState<string | null>(null);
  const [highlightedTerms, setHighlightedTerms] = useState<string[]>([]);

  useEffect(() => {
    // Extract technical terms and fetch explanations
    const loadConcepts = async () => {
      try {
        // Call API to extract and explain concepts
        const response = await fetch(
          `/api/articles/${articleId}/concepts?locale=${locale}`
        );
        const data = await response.json();

        if (data.concepts) {
          const conceptMap = new Map<string, ConceptExplanation>();
          data.concepts.forEach((concept: ConceptExplanation) => {
            conceptMap.set(concept.term.toLowerCase(), concept);
          });
          setConcepts(conceptMap);
          setHighlightedTerms(data.concepts.map((c: ConceptExplanation) => c.term));
        }
      } catch (error) {
        console.error('Failed to extract concepts:', error);
      }
    };

    loadConcepts();
  }, [content, articleId, locale]);

  /**
   * Process content to make terms interactive
   */
  const renderInteractiveContent = () => {
    if (highlightedTerms.length === 0) {
      return <div className="prose prose-invert max-w-none">{content}</div>;
    }

    // Split content by terms and wrap them
    const elements: JSX.Element[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    // Create regex pattern for all terms
    const pattern = new RegExp(
      `\\b(${highlightedTerms.join('|')})\\b`,
      'gi'
    );

    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${keyCounter++}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add interactive term
      const term = match[0];
      elements.push(
        <InteractiveTerm
          key={`term-${keyCounter++}`}
          term={term}
          onClick={() => setActiveConcept(term.toLowerCase())}
        />
      );

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${keyCounter++}`}>{content.slice(lastIndex)}</span>
      );
    }

    return <div className="prose prose-invert max-w-none">{elements}</div>;
  };

  const currentExplanation = activeConcept
    ? concepts.get(activeConcept)
    : null;

  return (
    <div className="relative">
      {/* Interactive content */}
      {renderInteractiveContent()}

      {/* Explanation modal */}
      <AnimatePresence>
        {activeConcept && currentExplanation && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveConcept(null)}
            />

            {/* Explanation card */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                         w-full max-w-2xl max-h-[80vh] overflow-y-auto z-50 p-4"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <Card className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border-white/20 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-2xl font-bold text-white">
                      {currentExplanation.term}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveConcept(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    aria-label={locale === 'en' ? 'Close' : 'Cerrar'}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Definition */}
                <div className="mb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {currentExplanation.definition}
                  </p>
                </div>

                {/* Visual aid */}
                {currentExplanation.visualAid && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-white/10">
                    <Image
                      src={currentExplanation.visualAid}
                      alt={`${currentExplanation.term} diagram`}
                      width={800}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {/* Examples */}
                {currentExplanation.examples &&
                  currentExplanation.examples.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {locale === 'en' ? 'Examples' : 'Ejemplos'}
                      </h4>
                      <ul className="space-y-2">
                        {currentExplanation.examples.map((example, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/50"
                          >
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Related entities from Knowledge Graph */}
                {currentExplanation.relatedEntities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">
                      {locale === 'en'
                        ? 'Related Concepts'
                        : 'Conceptos Relacionados'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentExplanation.relatedEntities.map((entity) => (
                        <a
                          key={entity.id}
                          href={`/${locale}/kg/${entity.id}`}
                          className="group"
                          onClick={() => setActiveConcept(null)}
                        >
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 hover:bg-primary/20 
                                     transition-colors cursor-pointer"
                          >
                            {entity.name}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Interactive term component
 */
function InteractiveTerm({
  term,
  onClick,
}: {
  term: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="relative inline-flex items-center gap-1 px-1 mx-0.5 rounded
                 text-primary font-medium cursor-pointer
                 hover:bg-primary/10 transition-colors group"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {term}
      <HelpCircle className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      
      {/* Underline effect */}
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}

/**
 * Floating explainer tooltip (alternative UI)
 */
export function FloatingExplainer({
  term,
  definition,
  position,
}: {
  term: string;
  definition: string;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 
                       border-white/20 p-4 max-w-xs shadow-2xl">
        <h4 className="text-sm font-bold text-white mb-2">{term}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {definition}
        </p>
      </Card>
    </motion.div>
  );
}
