import { getPostsByCategory, getPostsCountByCategory, getAllCategoryPaths } from '@/lib/posts';
import { PostWithHashtags } from '@/lib/db';
import { PostList } from '@/components/PostList';
import { CategoryTree } from '@/components/CategoryTree';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { config } from '@/lib/config';
import Link from 'next/link';

export const revalidate = false; // 완전 정적 (재배포 시에만 갱신)

// SSG: 빌드 시점에 모든 카테고리 페이지 생성
export function generateStaticParams() {
  const paths = getAllCategoryPaths();
  return paths.map((path) => ({
    path: path.split('/'),
  }));
}

interface CategoryPageProps {
  params: Promise<{ path: string[] }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { path } = await params;
  const categoryPath = decodeURIComponent(path.join('/'));

  let posts: PostWithHashtags[] = [];
  let totalCount = 0;

  try {
    posts = getPostsByCategory(categoryPath, config.postsPerPage, 0);
    totalCount = getPostsCountByCategory(categoryPath);
  } catch (error) {
    console.error('Error loading posts by category:', error);
  }

  // Build breadcrumb
  const parts = categoryPath.split('/');
  const breadcrumbs = parts.map((part, index) => ({
    name: part,
    path: parts.slice(0, index + 1).join('/'),
  }));

  return (
    <Box>
      <Box mb="6">
        <Flex align="center" gap="2" mb="2" wrap="wrap">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Text size="2" color="gray">전체</Text>
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <Flex key={crumb.path} align="center" gap="2">
              <Text size="2" color="gray">/</Text>
              <Link
                href={`/category/${encodeURIComponent(crumb.path)}`}
                style={{ textDecoration: 'none' }}
              >
                <Text
                  size="2"
                  color={index === breadcrumbs.length - 1 ? undefined : 'gray'}
                  weight={index === breadcrumbs.length - 1 ? 'medium' : undefined}
                >
                  {crumb.name}
                </Text>
              </Link>
            </Flex>
          ))}
        </Flex>

        <Heading size="6" mb="2">
          {parts[parts.length - 1]}
        </Heading>
        <Text color="gray" size="2">
          {totalCount}개의 글
        </Text>
      </Box>

      <CategoryTree defaultOpen />

      <PostList posts={posts} />
    </Box>
  );
}
