'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { Box } from '@radix-ui/themes';

export function Comments() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;

    const utterancesTheme = theme === 'dark' ? 'github-dark' : 'github-light';

    // Remove existing utterances if any
    const existingScript = ref.current.querySelector('.utterances');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', '2p31-1/blog.2p31.art');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', utterancesTheme);
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    ref.current.appendChild(script);
  }, [theme]);

  return (
    <Box mt="8" pt="6" style={{ borderTop: '1px solid var(--gray-4)' }}>
      <div ref={ref} className="utterances-container" />
      <style jsx global>{`
        .utterances {
          max-width: 100%;
        }
        .utterances-frame {
          width: 100%;
        }
      `}</style>
    </Box>
  );
}
