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
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { theme } = useTheme();

  // Transform relative image paths to /md/ paths with encoding
  const transformedContent = content.replace(
    /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
    (_, alt, path) => `![${alt}](/md/${encodeURIComponent(path).replace(/%2F/g, '/')})`
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
