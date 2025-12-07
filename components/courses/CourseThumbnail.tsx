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

  const ratio = `${width || 400} / ${height || 225}`;

  if (!src || errored) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          aspectRatio: ratio,
          minHeight: height || 225,
          backgroundColor: '#020309',
          color: '#EAEAEA',
          border: '2px solid #1F1F1F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textTransform: 'uppercase',
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.08em' }}>
          Image unavailable
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7A7A7A' }}>
          Flux / Qwen failed for {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 225}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
