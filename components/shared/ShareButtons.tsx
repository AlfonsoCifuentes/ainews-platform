'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Twitter, Linkedin, Facebook, Link2, Check, MessageCircle } from 'lucide-react';
import type { INewsArticle } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { getLocalizedString } from '@/lib/utils/i18n';

interface ShareButtonsProps {
  article: INewsArticle;
  locale: Locale;
  className?: string;
}

export function ShareButtons({ article, locale, className = '' }: ShareButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = getLocalizedString(article, 'title', locale);
  const summary = getLocalizedString(article, 'summary', locale);
  const url = typeof window !== 'undefined' 
    ? `${window.location.origin}/${locale}/news/${article.id}`
    : '';

  const shareText = `${title} - ${summary.substring(0, 100)}...`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
  };

  const shareOptions = [
    { name: 'Twitter', icon: Twitter, href: shareLinks.twitter },
    { name: 'LinkedIn', icon: Linkedin, href: shareLinks.linkedin },
    { name: 'Facebook', icon: Facebook, href: shareLinks.facebook },
    { name: 'WhatsApp', icon: MessageCircle, href: shareLinks.whatsapp },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Share Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-black/30 hover:bg-white/5 transition-colors text-sm font-medium"
      >
        <Share2 className="w-4 h-4" />
        <span>{locale === 'en' ? 'Share' : 'Compartir'}</span>
      </motion.button>

      {/* Share Options Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 z-50 min-w-[220px] rounded-2xl bg-[#0A0A0A]/95 border border-white/12 shadow-2xl overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {/* Social Media Options */}
              {shareOptions.map((option) => (
                <a
                  key={option.name}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5 text-white"
                >
                  <div className="w-8 h-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                    <option.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{option.name}</span>
                </a>
              ))}

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5 text-white"
              >
                <div className="w-8 h-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                  {copied ? (
                    <Check className="w-4 h-4 text-green-300" />
                  ) : (
                    <Link2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="font-medium">
                  {copied 
                    ? (locale === 'en' ? 'Copied!' : '¡Copiado!') 
                    : (locale === 'en' ? 'Copy Link' : 'Copiar Enlace')
                  }
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Mini share buttons (for cards)
export function MiniShareButtons({ article, locale }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const title = getLocalizedString(article, 'title', locale);
  const url = typeof window !== 'undefined' 
    ? `${window.location.origin}/${locale}/news/${article.id}`
    : '';

  const handleQuickShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: getLocalizedString(article, 'summary', locale),
          url,
        });
      } catch {
        // User cancelled or error occurred
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <motion.button
      onClick={handleQuickShare}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 rounded-full border border-white/15 bg-black/30 hover:bg-white/5 transition-colors"
      title={locale === 'en' ? 'Share' : 'Compartir'}
    >
      {copied ? (
        <Check className="w-4 h-4 text-primary" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
    </motion.button>
  );
}
