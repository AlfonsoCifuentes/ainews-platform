/**
 * Enhanced Article Card with Premium Micro-interactions
 * Features: 3D tilt, glassmorphism, kinetic animations
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Clock, TrendingUp, Bookmark, Share2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getLocalizedField } from '@/lib/utils/i18n';
import type { INewsArticle } from '@/lib/types/news';

interface EnhancedArticleCardProps {
  article: INewsArticle;
  locale: 'en' | 'es';
  priority?: boolean;
  onBookmark?: (id: string) => void;
  onShare?: (article: INewsArticle) => void;
  isBookmarked?: boolean;
}

export default function EnhancedArticleCard({
  article,
  locale,
  priority = false,
  onBookmark,
  onShare,
  isBookmarked = false,
}: EnhancedArticleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7.5deg', '-7.5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7.5deg', '7.5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const title = getLocalizedField(article, 'title', locale) as string;
  const summary = getLocalizedField(article, 'summary', locale) as string;
  const readingTime = Math.ceil((summary?.length || 0) / 200); // ~200 chars per minute

  return (
    <motion.div
      ref={cardRef}
      className="group relative h-full"
      style={{
        perspective: '1000px',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.article
        className="relative h-full overflow-hidden rounded-3xl 
                   backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5
                   border border-white/20 shadow-lg
                   transition-all duration-500"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{
          scale: 1.02,
          boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 
                     bg-gradient-to-br from-primary/20 via-transparent to-purple-500/20
                     transition-opacity duration-500 pointer-events-none"
          style={{
            transform: 'translateZ(1px)',
          }}
        />

        {/* Image section with parallax effect */}
        <Link href={`/${locale}/news/${article.id}`}>
          <div className="relative aspect-video overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.6s ease-out',
              }}
            >
              <Image
                src={article.image_url || '/placeholder-news.jpg'}
                alt={title}
                fill
                className="object-cover"
                priority={priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </motion.div>

            {/* Gradient overlay on image */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent
                         opacity-60 group-hover:opacity-80 transition-opacity duration-300"
            />

            {/* Trending badge */}
            {'trending_score' in article && (article as { trending_score: number }).trending_score > 0.7 && (
              <motion.div
                className="absolute top-4 right-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Badge variant="default" className="flex items-center gap-1 backdrop-blur-md">
                  <TrendingUp className="w-3 h-3" />
                  {locale === 'en' ? 'Trending' : 'Tendencia'}
                </Badge>
              </motion.div>
            )}

            {/* Category badge */}
            {article.category && (
              <motion.div
                className="absolute top-4 left-4"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge
                  variant="secondary"
                  className="backdrop-blur-md bg-white/20 text-white border-white/30"
                >
                  {article.category}
                </Badge>
              </motion.div>
            )}
          </div>
        </Link>

        {/* Content section */}
        <div className="p-6 space-y-4" style={{ transform: 'translateZ(20px)' }}>
          {/* Title with kinetic animation */}
          <Link href={`/${locale}/news/${article.id}`}>
            <motion.h3
              className="text-2xl font-bold leading-tight
                         bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent
                         group-hover:from-primary group-hover:to-purple-400
                         transition-all duration-300 line-clamp-2"
            >
              {title}
            </motion.h3>
          </Link>

          {/* Summary */}
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {summary}
          </p>

          {/* Metadata row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {/* Reading time */}
              <motion.div
                className="flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
              >
                <Clock className="w-3 h-3" />
                <span>
                  {readingTime} {locale === 'en' ? 'min read' : 'min lectura'}
                </span>
              </motion.div>

              {/* Published date */}
              {article.published_at && (
                <span>
                  {new Date(article.published_at).toLocaleDateString(
                    locale === 'en' ? 'en-US' : 'es-ES',
                    { month: 'short', day: 'numeric' }
                  )}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Bookmark button */}
              {onBookmark && (
                <motion.button
                  className={`p-2 rounded-full backdrop-blur-md
                             ${
                               isBookmarked
                                 ? 'bg-primary text-primary-foreground'
                                 : 'bg-white/10 text-white hover:bg-white/20'
                             }
                             transition-colors duration-200`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    onBookmark(article.id);
                  }}
                  aria-label={locale === 'en' ? 'Bookmark' : 'Guardar'}
                >
                  <Bookmark
                    className="w-4 h-4"
                    fill={isBookmarked ? 'currentColor' : 'none'}
                  />
                </motion.button>
              )}

              {/* Share button */}
              {onShare && (
                <motion.button
                  className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white
                             hover:bg-white/20 transition-colors duration-200"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    onShare(article);
                  }}
                  aria-label={locale === 'en' ? 'Share' : 'Compartir'}
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
              )}

              {/* External link indicator */}
              {article.source_url && (
                <motion.a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full backdrop-blur-md bg-white/10 text-white
                             hover:bg-white/20 transition-colors duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={locale === 'en' ? 'View source' : 'Ver fuente'}
                >
                  <ExternalLink className="w-4 h-4" />
                </motion.a>
              )}
            </div>
          </div>
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            transform: 'translateZ(2px)',
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%', skewX: -20 }}
            animate={
              isHovered
                ? {
                    x: '200%',
                    transition: { duration: 0.8, ease: 'easeInOut' },
                  }
                : { x: '-100%' }
            }
          />
        </motion.div>
      </motion.article>
    </motion.div>
  );
}
