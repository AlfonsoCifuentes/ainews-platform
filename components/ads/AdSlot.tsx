'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot: string;
  client?: string;
  format?: 'auto' | 'fluid';
  responsive?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function AdSlot({
  slot,
  client,
  format = 'auto',
  responsive = true,
  className,
  style,
}: AdSlotProps) {
  const adClient = client ?? process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const insRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!adClient) return;

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore ad blocker / script load failures
    }
  }, [adClient]);

  if (process.env.NODE_ENV !== 'production') return null;
  if (!adClient) return null;

  return (
    <ins
      ref={(el) => {
        insRef.current = el;
      }}
      className={['adsbygoogle', className].filter(Boolean).join(' ')}
      style={{ display: 'block', ...(style ?? {}) }}
      data-ad-client={adClient}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
