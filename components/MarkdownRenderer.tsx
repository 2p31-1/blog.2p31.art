import ReactMarkdown from 'react-markdown';
import { Box } from '@radix-ui/themes';
import remarkGfm from 'remark-gfm';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypePrism from 'rehype-prism-plus';
import { CodeCopyButton } from './CodeCopyButton';
import { BlurImage } from './BlurImage';
import { HeadingAnchorInteraction } from './HeadingAnchorInteraction';

interface MarkdownRendererProps {
  content: string;
  slug: string;
}

export function MarkdownRenderer({ content, slug }: MarkdownRendererProps) {
  // Get directory from slug (e.g., "분류1/a" -> "분류1")
  const slugDir = slug.includes('/') ? slug.substring(0, slug.lastIndexOf('/')) : '';

  // Transform relative image paths to /md/ paths with encoding
  const transformedContent = content.replace(
    /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
    (_, alt, path) => {
      const fullPath = slugDir ? `${slugDir}/${path}` : path;
      return `![${alt}](/md/${encodeURIComponent(fullPath).replace(/%2F/g, '/')})`;
    }
  );

  return (
    <Box className="markdown-content wmde-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAlert]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, {
            behavior: 'prepend',
            properties: {
              className: ['anchor'],
              ariaHidden: true,
              tabIndex: -1,
            },
            content: {
              type: 'element',
              tagName: 'svg',
              properties: {
                className: ['octicon', 'octicon-link'],
                viewBox: '0 0 16 16',
                version: '1.1',
                width: '16',
                height: '16',
                ariaHidden: 'true',
              },
              children: [{
                type: 'element',
                tagName: 'path',
                properties: {
                  fillRule: 'evenodd',
                  d: 'M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z',
                },
                children: [],
              }],
            },
          }],
          rehypeRaw,
          [rehypePrism, { ignoreMissing: true, showLineNumbers: false }],
        ]}
        components={{
          img: ({ src, alt }) => (
            <BlurImage src={src || ''} alt={alt || ''} />
          ),
          pre: ({ children, ...props }) => {
            // Extract code content for copy button
            const codeElement = children as React.ReactElement;
            let codeString = '';

            if (codeElement?.props?.children) {
              const extractText = (node: React.ReactNode): string => {
                if (typeof node === 'string') return node;
                if (Array.isArray(node)) return node.map(extractText).join('');
                if (node && typeof node === 'object' && 'props' in node) {
                  return extractText((node as React.ReactElement).props.children);
                }
                return '';
              };
              codeString = extractText(codeElement.props.children);
            }

            return (
              <pre {...props}>
                {children}
                <CodeCopyButton code={codeString} />
              </pre>
            );
          },
        }}
      >
        {transformedContent}
      </ReactMarkdown>
      <HeadingAnchorInteraction />
    </Box>
  );
}
