'use client';

import { Badge, Flex } from '@radix-ui/themes';
import Link from 'next/link';

interface HashtagListProps {
  hashtags: string[];
  clickable?: boolean;
}

export function HashtagList({ hashtags, clickable = true }: HashtagListProps) {
  if (hashtags.length === 0) return null;

  return (
    <Flex gap="2" wrap="wrap">
      {hashtags.map((tag) =>
        clickable ? (
          <Link key={tag} href={`/hashtag/${encodeURIComponent(tag)}`}>
            <Badge variant="soft" color="gray" style={{ cursor: 'pointer' }}>
              #{tag}
            </Badge>
          </Link>
        ) : (
          <Badge key={tag} variant="soft" color="gray">
            #{tag}
          </Badge>
        )
      )}
    </Flex>
  );
}
