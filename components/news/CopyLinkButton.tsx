'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

export function CopyLinkButton({ locale }: { locale: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  };

  return (
    <button
      onClick={copy}
      className="rounded-full border border-border bg-card p-3 transition-all hover:border-primary hover:bg-primary/10"
      aria-label={copied ? (locale === 'en' ? 'Link copied' : 'Enlace copiado') : locale === 'en' ? 'Copy link' : 'Copiar enlace'}
    >
      {copied ? <Check className="h-5 w-5 text-primary" /> : <Link2 className="h-5 w-5" />}
    </button>
  );
}
