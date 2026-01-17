'use client';

import { Box, Card, Flex, Heading, Text, Badge } from '@radix-ui/themes';
import { ClockIcon, CalendarIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import Image from 'next/image';

interface PostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  blurDataURL: string | null;
  category: string;
  createdAt: string;
  modifiedAt: string;
  readingTime: number;
  hashtags: string[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getThumbnailUrl(thumbnail: string): string {
  if (thumbnail.startsWith('http')) {
    return thumbnail;
  }
  return `/md/${encodeURIComponent(thumbnail).replace(/%2F/g, '/')}`;
}

export function PostCard({
  slug,
  title,
  excerpt,
  thumbnail,
  blurDataURL,
  category,
  createdAt,
  modifiedAt,
  readingTime,
  hashtags,
}: PostCardProps) {
  const isModified = createdAt !== modifiedAt;

  return (
    <Link href={`/blog/${slug}`} style={{ textDecoration: 'none' }}>
      <Card size="2" style={{ cursor: 'pointer', overflow: 'hidden' }} className="post-card">
        <Flex gap="4">
          <Box style={{ flex: 1 }}>
            <Heading size="4" mb="1" style={{ color: 'var(--gray-12)' }}>
              {title}
            </Heading>

            {category && (
              <Text size="1" color="gray" mb="2" as="div">
                {category}
              </Text>
            )}

            <Flex gap="3" mb="3" wrap="wrap">
              <Flex align="center" gap="1">
                <CalendarIcon />
                <Text size="1" color="gray">
                  {formatDate(createdAt)}
                </Text>
              </Flex>

              {isModified && (
                <Text size="1" color="gray">
                  (수정: {formatDate(modifiedAt)})
                </Text>
              )}

              <Flex align="center" gap="1">
                <ClockIcon />
                <Text size="1" color="gray">
                  {readingTime}분
                </Text>
              </Flex>
            </Flex>

            {excerpt && (
              <Text as="p" size="2" color="gray" mb="3">
                {excerpt}
              </Text>
            )}

            {hashtags.length > 0 && (
              <Flex gap="2" wrap="wrap">
                {hashtags.map((tag) => (
                  <Badge key={tag} variant="soft" color="gray">
                    #{tag}
                  </Badge>
                ))}
              </Flex>
            )}
          </Box>

          {thumbnail && (
            <Box
              style={{
                width: 120,
                height: 120,
                flexShrink: 0,
                borderRadius: 'var(--radius-2)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Image
                src={getThumbnailUrl(thumbnail)}
                alt=""
                fill
                sizes="120px"
                style={{ objectFit: 'cover' }}
                placeholder={blurDataURL ? 'blur' : 'empty'}
                blurDataURL={blurDataURL || undefined}
              />
            </Box>
          )}
        </Flex>
      </Card>
    </Link>
  );
}
