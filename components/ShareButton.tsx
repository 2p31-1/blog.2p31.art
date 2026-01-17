'use client';

import { useState } from 'react';
import { IconButton, Tooltip } from '@radix-ui/themes';
import { Share1Icon, CheckIcon } from '@radix-ui/react-icons';

interface ShareButtonProps {
  title: string;
  url?: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    // Copy to clipboard first
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }

    // Show check mark immediately after copy
    setShared(true);
    setTimeout(() => setShared(false), 2000);

    // Then show share dialog
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Share failed:', e);
        }
      }
    }
  };

  return (
    <Tooltip content={shared ? '복사됨!' : '공유하기'}>
      <IconButton
        variant="ghost"
        color={shared ? 'green' : 'gray'}
        onClick={handleShare}
        style={{ cursor: 'pointer' }}
      >
        {shared ? <CheckIcon width="18" height="18" /> : <Share1Icon width="18" height="18" />}
      </IconButton>
    </Tooltip>
  );
}
