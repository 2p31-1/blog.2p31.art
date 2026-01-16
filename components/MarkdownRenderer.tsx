'use client';

import dynamic from 'next/dynamic';
import { Box } from '@radix-ui/themes';
import { useTheme } from './ThemeProvider';

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownRendererProps {
  content: string;
  slug: string;
}

export function MarkdownRenderer({ content, slug }: MarkdownRendererProps) {
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
      />
    </Box>
  );
}
