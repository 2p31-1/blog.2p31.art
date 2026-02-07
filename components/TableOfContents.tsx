'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  variant?: 'mobile' | 'desktop';
}

function extractHeadings(content: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = content.split('\n');

  let inCodeBlock = false;
  let codeBlockFence = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for code block fences (``` or ~~~)
    const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        codeBlockFence = fenceMatch[1][0]; // ` or ~
      } else if (fenceMatch[1][0] === codeBlockFence) {
        // Ending a code block (must match the opening fence type)
        inCodeBlock = false;
        codeBlockFence = '';
      }
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) {
      continue;
    }

    // Check for HTML comments (skip entire comment blocks)
    if (trimmedLine.includes('<!--')) {
      // Simple check - skip lines with HTML comments
      // A more robust implementation would track multi-line comments
      continue;
    }

    // Match headings (must be at start of line, not in inline code)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let text = headingMatch[2].trim();

      // Remove inline code, links, and other markdown formatting from heading text
      // Remove inline code first
      text = text.replace(/`[^`]+`/g, '');
      // Remove links but keep the text
      text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      // Remove emphasis markers
      text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
      text = text.replace(/(\*|_)(.*?)\1/g, '$2');
      // Remove HTML tags
      text = text.replace(/<[^>]+>/g, '');
      // Final trim
      text = text.trim();

      // Skip if heading is empty after cleanup
      if (!text) {
        continue;
      }

      // ID 생성 로직 (react-markdown-preview와 동일하게)
      const id = text
        .toLowerCase()
        .replace(/[^\w\s\uAC00-\uD7AF-]/g, '')
        .replace(/\s+/g, '-');

      headings.push({ id, text, level });
    }
  }

  return headings;
}

export function TableOfContents({ content, variant = 'mobile' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    setHeadings(extractHeadings(content));
  }, [content]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (variant === 'mobile') {
    return (
      <nav className="toc-mobile" aria-label="목차" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <div
          style={{
            padding: '16px',
            background: 'var(--gray-2)',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--gray-4)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px', color: 'var(--gray-11)' }}>
            목차
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
            {headings.map(({ id, text, level }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => handleClick(e, id)}
                  style={{
                    paddingLeft: `${(level - minLevel) * 12}px`,
                    fontSize: '14px',
                    color: activeId === id ? 'var(--accent-11)' : 'var(--gray-11)',
                    textDecoration: 'none',
                    lineHeight: 1.5,
                    transition: 'color 0.2s',
                    display: 'block',
                  }}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className="toc-desktop" aria-label="목차">
      <div
        style={{
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 500, marginBottom: '12px', color: 'var(--gray-9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          On this page
        </div>
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderLeft: '1px solid var(--gray-4)',
            paddingLeft: '12px',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {headings.map(({ id, text, level }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                style={{
                  paddingLeft: `${(level - minLevel) * 10}px`,
                  fontSize: '13px',
                  color: activeId === id ? 'var(--accent-11)' : 'var(--gray-10)',
                  fontWeight: activeId === id ? 500 : 400,
                  textDecoration: 'none',
                  lineHeight: 1.6,
                  transition: 'color 0.15s, font-weight 0.15s',
                  display: 'block',
                }}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
