'use client';

import dynamic from 'next/dynamic';
import { Box } from '@radix-ui/themes';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownRendererProps {
  content: string;
  slug: string;
  blurData?: Record<string, string>;
}

// Custom image component with blur placeholder
function BlurImage({ src, alt, blurData }: { src: string; alt: string; blurData?: Record<string, string> }) {
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

export function MarkdownRenderer({ content, slug, blurData }: MarkdownRendererProps) {
  const { theme } = useTheme();

  // Get directory from slug (e.g., "분류1/a" -> "분류1")
  const slugDir = slug.includes('/') ? slug.substring(0, slug.lastIndexOf('/')) : '';

  // Transform relative image paths to /md/ paths with encoding
  // Resolve relative to the markdown file's directory
  const transformedContent = content.replace(
    /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
    (_, alt, path) => {
      // Combine slug directory with image path
      const fullPath = slugDir ? `${slugDir}/${path}` : path;
      return `![${alt}](/md/${encodeURIComponent(fullPath).replace(/%2F/g, '/')})`;
    }
  );

  return (
    <Box className="markdown-content">
      <MarkdownPreview
        source={transformedContent}
        style={{
          backgroundColor: 'transparent',
          color: 'var(--gray-12)',
        }}
        wrapperElement={{
          'data-color-mode': theme,
        }}
        components={{
          img: ({ src, alt }) => (
            <BlurImage src={src || ''} alt={alt || ''} blurData={blurData} />
          ),
        }}
      />
    </Box>
  );
}
