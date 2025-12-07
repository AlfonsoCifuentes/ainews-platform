'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Twitter, Facebook, Linkedin, Mail } from 'lucide-react';
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

  const shareActions = [
    {
      label: t.whatsapp,
      icon: MessageCircle,
      onClick: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
        window.open(whatsappUrl, '_blank');
      },
    },
    {
      label: t.twitter,
      icon: Twitter,
      onClick: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(courseUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
      },
    },
    {
      label: t.facebook,
      icon: Facebook,
      onClick: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}`;
        window.open(facebookUrl, '_blank', 'width=550,height=420');
      },
    },
    {
      label: t.linkedin,
      icon: Linkedin,
      onClick: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}`;
        window.open(linkedinUrl, '_blank', 'width=550,height=420');
      },
    },
    {
      label: t.email,
      icon: Mail,
      onClick: () => {
        const emailUrl = `mailto:?subject=${encodeURIComponent(courseTitle)}&body=${encodeURIComponent(fullShareText)}`;
        window.location.href = emailUrl;
      },
    },
  ];

  // If Web Share API is available (mobile), use it directly
  if (isMobile && hasNativeShare && variant === 'default') {
    return (
      <button
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl 
                   border border-white/15 bg-black/40 text-white font-medium transition-all duration-300
                   hover:bg-white/5"
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
              border border-white/15 bg-black/40 text-white font-medium transition-all duration-300
              hover:bg-white/5`
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
                         backdrop-blur-xl bg-[#0A0A0A]/95 border border-white/12
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center bg-white/5">
                    {copied ? (
                      <Check className="w-5 h-5 text-green-300" />
                    ) : (
                      <Copy className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {copied ? t.copied : t.copyLink}
                    </div>
                  </div>
                </button>

                <div className="h-px bg-white/10 my-2" />

                {shareActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      action.onClick();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center bg-white/5">
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{action.label}</div>
                      {isMobile && action.label === t.whatsapp && (
                        <div className="text-[11px] text-white/60">Direct share</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
