"use client";

import { useState } from 'react';
import Image from 'next/image';

interface Props {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function CourseThumbnail({ src, alt, width, height, className }: Props) {
  const [errored, setErrored] = useState(false);
  const fallback = '/images/placeholder-ai-news.svg';
  const srcToUse = !errored && src ? src : fallback;

  return (
    <Image
      src={srcToUse}
      alt={alt}
      width={width || 400}
      height={height || 225}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
