'use client';

import { useState } from 'react';

interface BlurImageProps {
  src: string;
  alt: string;
  blurData?: Record<string, string>;
}

export function BlurImage({ src, alt, blurData }: BlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const blurDataURL = blurData?.[src];

  return (
    <span style={{ display: 'block', position: 'relative', width: '100%' }}>
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        style={{
          maxWidth: '100%',
          height: 'auto',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </span>
  );
}
