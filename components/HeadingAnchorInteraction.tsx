'use client';

import { useEffect } from 'react';

export function HeadingAnchorInteraction() {
  useEffect(() => {
    // Add click handler for anchor links to copy URL
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a.anchor');

      if (anchor) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href) {
          const url = `${window.location.origin}${window.location.pathname}${href}`;
          navigator.clipboard.writeText(url).then(() => {
            // Optional: Show feedback
            const heading = anchor.parentElement;
            if (heading) {
              heading.style.transition = 'background-color 0.3s';
              heading.style.backgroundColor = 'var(--color-accent-subtle, rgba(9, 105, 218, 0.1))';
              setTimeout(() => {
                heading.style.backgroundColor = '';
              }, 1000);
            }
          });
          // Also update the URL
          window.history.pushState(null, '', `${window.location.pathname}${href}`);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return null;
}
