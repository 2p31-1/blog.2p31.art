'use client';

import { useEffect } from 'react';

export function SpoilerInteraction() {
  useEffect(() => {
    const handleSpoilerClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('spoiler')) {
        target.classList.toggle('revealed');
      }
    };

    document.addEventListener('click', handleSpoilerClick);
    return () => document.removeEventListener('click', handleSpoilerClick);
  }, []);

  return null;
}
