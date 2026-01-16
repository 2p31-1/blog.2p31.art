'use client';

import { Box, Flex, Text } from '@radix-ui/themes';
import { PostCard } from './PostCard';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  category: string;
  created_at: string;
  modified_at: string;
  reading_time: number;
  hashtags: string[];
}

interface PostListProps {
  posts: Post[];
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <Box py="9">
        <Flex direction="column" align="center" gap="2">
          <Text size="5" color="gray">
            글이 없습니다
          </Text>
          <Text size="2" color="gray">
            첫 번째 글을 작성해보세요!
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {posts.map((post) => (
        <PostCard
          key={post.slug}
          slug={post.slug}
          title={post.title}
          excerpt={post.excerpt}
          thumbnail={post.thumbnail}
          category={post.category}
          createdAt={post.created_at}
          modifiedAt={post.modified_at}
          readingTime={post.reading_time}
          hashtags={post.hashtags}
        />
      ))}
    </Flex>
  );
}
