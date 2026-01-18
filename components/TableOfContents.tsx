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
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // ID 생성 로직 (react-markdown-preview와 동일하게)
    const id = text
      .toLowerCase()
      .replace(/[^\w\s\uAC00-\uD7AF-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ id, text, level });
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
