'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareCourseButtonProps {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  locale: 'en' | 'es';
  variant?: 'default' | 'minimal';
}

export function ShareCourseButton({
  courseId,
  courseTitle,
  courseDescription,
  locale,
  variant = 'default'
}: ShareCourseButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = locale === 'en' ? {
    share: 'Share Course',
    copyLink: 'Copy Link',
    whatsapp: 'WhatsApp',
    twitter: 'Twitter',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    email: 'Email',
    copied: 'Link Copied!',
    shareText: 'Check out this AI course',
  } : {
    share: 'Compartir Curso',
    copyLink: 'Copiar Enlace',
    whatsapp: 'WhatsApp',
    twitter: 'Twitter',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    email: 'Correo',
    copied: '¡Enlace Copiado!',
    shareText: 'Mira este curso de IA',
  };

  const courseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${locale}/courses/${courseId}`
    : '';

  const shareText = `${t.shareText}: ${courseTitle}`;
  const fullShareText = `${shareText}\n\n${courseDescription}\n\n${courseUrl}`;

  // Detect if mobile device
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hasNativeShare = typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator;

  const handleNativeShare = async () => {
    if (hasNativeShare && navigator.share) {
      try {
        await navigator.share({
          title: courseTitle,
          text: `${shareText}\n\n${courseDescription}`,
          url: courseUrl,
        });
        setShowMenu(false);
      } catch {
        // User cancelled or error
        console.log('Share cancelled');
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
    window.open(whatsappUrl, '_blank');
    setShowMenu(false);
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(courseUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}`;
    window.open(linkedinUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleEmail = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent(courseTitle)}&body=${encodeURIComponent(fullShareText)}`;
    window.location.href = emailUrl;
    setShowMenu(false);
  };

  // If Web Share API is available (mobile), use it directly
  if (isMobile && hasNativeShare && variant === 'default') {
    return (
      <button
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl 
                   bg-primary/10 hover:bg-primary/20 border border-primary/20
                   text-primary font-medium transition-all duration-300
                   hover:scale-105 active:scale-95"
      >
        <Share2 className="w-4 h-4" />
        <span>{t.share}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={
          variant === 'minimal'
            ? "p-2 rounded-lg hover:bg-muted/50 transition-colors"
            : `inline-flex items-center gap-2 px-4 py-2 rounded-xl 
               bg-primary/10 hover:bg-primary/20 border border-primary/20
               text-primary font-medium transition-all duration-300
               hover:scale-105 active:scale-95`
        }
        aria-label={t.share}
      >
        <Share2 className="w-4 h-4" />
        {variant === 'default' && <span>{t.share}</span>}
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-64 z-50
                         backdrop-blur-xl bg-background/95 border border-white/10
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 space-y-1">
                {/* WhatsApp - Destacado en móvil */}
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-[#25D366]/10 transition-colors group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium group-hover:text-[#25D366] transition-colors">
                      {t.whatsapp}
                    </div>
                    {isMobile && (
                      <div className="text-xs text-muted-foreground">
                        Compartir directamente
                      </div>
                    )}
                  </div>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-muted transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {copied ? t.copied : t.copyLink}
                    </div>
                  </div>
                </button>

                <div className="h-px bg-border my-2" />

                {/* Twitter */}
                <button
                  onClick={handleTwitter}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-[#1DA1F2]/10 transition-colors group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="font-medium group-hover:text-[#1DA1F2] transition-colors">
                    {t.twitter}
                  </div>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleFacebook}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-[#1877F2]/10 transition-colors group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="font-medium group-hover:text-[#1877F2] transition-colors">
                    {t.facebook}
                  </div>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={handleLinkedIn}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-[#0A66C2]/10 transition-colors group text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div className="font-medium group-hover:text-[#0A66C2] transition-colors">
                    {t.linkedin}
                  </div>
                </button>

                {/* Email */}
                <button
                  onClick={handleEmail}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           hover:bg-muted transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-medium">
                    {t.email}
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
