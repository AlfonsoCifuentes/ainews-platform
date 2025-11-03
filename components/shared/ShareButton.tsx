'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Link2, 
  Mail,
  MessageCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  title: string;
  url: string;
  description?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ShareButton({ 
  title, 
  url, 
  description = '', 
  size = 'default',
  className = ''
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${url}` 
    : url;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setIsOpen(true);
    }
  };

  const shareOptions = [
    {
      name: 'Twitter',
      icon: Twitter,
      href: shareLinks.twitter,
      color: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: shareLinks.facebook,
      color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: shareLinks.linkedin,
      color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: shareLinks.whatsapp,
      color: 'hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30',
    },
    {
      name: 'Email',
      icon: Mail,
      href: shareLinks.email,
      color: 'hover:bg-primary/10 hover:text-primary hover:border-primary/30',
    },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Main share button */}
      <Button
        variant="outline"
        size={size}
        onClick={handleNativeShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </Button>

      {/* Share menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Share options */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-2 z-50 w-72 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl p-4"
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white mb-1">Share this</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{title}</p>
              </div>

              <div className="space-y-2">
                {/* Social share buttons */}
                {shareOptions.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <motion.a
                      key={option.name}
                      href={option.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 transition-all ${option.color}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{option.name}</span>
                    </motion.a>
                  );
                })}

                {/* Copy link button */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: shareOptions.length * 0.05 }}
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-500">Link copied!</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Copy link</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
