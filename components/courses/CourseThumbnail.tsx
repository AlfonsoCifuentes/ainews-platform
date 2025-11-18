"use client";

import { useState } from 'react';

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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={srcToUse}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}
