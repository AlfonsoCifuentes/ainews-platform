'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react';

interface ShareCourseProps {
  courseId: string;
  title: string;
  locale: string;
}

export function ShareCourse({ courseId, title, locale }: ShareCourseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const courseUrl = `${siteUrl}/${locale}/courses/${courseId}`;
  const encodedUrl = encodeURIComponent(courseUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: courseUrl,
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 bg-black/40
                 hover:bg-white/5 transition-all duration-300"
      >
        <Share2 className="w-4 h-4" />
        <span>{locale === 'es' ? 'Compartir' : 'Share'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-64 p-4 rounded-xl bg-[#0A0A0A]/95 border border-white/12
                     backdrop-blur-xl shadow-2xl z-50"
          >
            <p className="text-sm font-semibold mb-3">
              {locale === 'es' ? 'Compartir curso' : 'Share course'}
            </p>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10
                         transition-all group"
              >
                <Twitter className="w-5 h-5 text-white transition-colors" />
                <span className="text-xs">Twitter</span>
              </a>

              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10
                         transition-all group"
              >
                <Facebook className="w-5 h-5 text-white transition-colors" />
                <span className="text-xs">Facebook</span>
              </a>

              <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10
                         transition-all group"
              >
                <Linkedin className="w-5 h-5 text-white transition-colors" />
                <span className="text-xs">LinkedIn</span>
              </a>
            </div>

            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                       border border-white/15 bg-white/5 hover:bg-white/10 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-300" />
                  <span className="text-sm text-green-300">
                    {locale === 'es' ? '¡Copiado!' : 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 text-white" />
                  <span className="text-sm">
                    {locale === 'es' ? 'Copiar enlace' : 'Copy link'}
                  </span>
                </>
              )}
            </button>
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
