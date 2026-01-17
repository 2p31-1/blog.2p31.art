'use client';

import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { PostCard } from './PostCard';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail: string | null;
  blur_data_url: string | null;
  category: string;
  created_at: string;
  modified_at: string;
  reading_time: number;
  hashtags: string[];
}

interface PostListProps {
  posts: Post[];
  paginationPath?: string; // e.g., '/data/posts', '/data/category/BE', '/data/hashtag/oauth2'
  initialPage?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export function PostList({
  posts: initialPosts,
  paginationPath,
  initialPage = 1,
  totalPages = 1,
  hasMore: initialHasMore = false,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !paginationPath) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`${paginationPath}/page-${nextPage}.json`);
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, paginationPath, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!paginationPath || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loading, loadMore, paginationPath]);

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
          blurDataURL={post.blur_data_url}
          category={post.category}
          createdAt={post.created_at}
          modifiedAt={post.modified_at}
          readingTime={post.reading_time}
          hashtags={post.hashtags}
        />
      ))}

      {/* Infinite scroll trigger */}
      {paginationPath && hasMore && (
        <Box ref={loaderRef} py="4">
          <Flex justify="center">
            {loading ? (
              <Text size="2" color="gray">로딩 중...</Text>
            ) : (
              <Button variant="soft" color="gray" onClick={loadMore}>
                더 보기
              </Button>
            )}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
