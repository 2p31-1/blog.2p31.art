'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { Box } from '@radix-ui/themes';

export function Comments() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // 초기 마운트 시 한 번만 스크립트 로드
  useEffect(() => {
    if (!ref.current || ref.current.querySelector('.utterances')) return;

    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', '2p31-1/blog.2p31.art');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', theme === 'dark' ? 'github-dark' : 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    ref.current.appendChild(script);
  }, []);

  // 테마 변경 시 postMessage로 테마만 변경
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.utterances-frame');
    if (iframe) {
      const utterancesTheme = theme === 'dark' ? 'github-dark' : 'github-light';
      iframe.contentWindow?.postMessage(
        { type: 'set-theme', theme: utterancesTheme },
        'https://utteranc.es'
      );
    }
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
