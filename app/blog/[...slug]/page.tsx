import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPostBySlug } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { HashtagList } from '@/components/HashtagList';
import { ShareButton } from '@/components/ShareButton';
import { Comments } from '@/components/Comments';
import { Box, Flex, Heading, Text, Separator } from '@radix-ui/themes';
import { ClockIcon, CalendarIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface BlogPostPageProps {
  params: Promise<{ slug: string[] }>;
}

function getAbsoluteThumbnailUrl(thumbnail: string): string {
  if (thumbnail.startsWith('http')) {
    return thumbnail;
  }
  return `${config.siteUrl}/md/${encodeURIComponent(thumbnail).replace(/%2F/g, '/')}`;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = decodeURIComponent(slug.join('/'));

  try {
    const post = getPostBySlug(slugPath);
    if (!post) return {};

    const url = `${config.siteUrl}/blog/${slug.join('/')}`;
    const images = post.thumbnail ? [getAbsoluteThumbnailUrl(post.thumbnail)] : [];

    return {
      title: `${post.title} | ${config.blogName}`,
      description: post.excerpt || config.blogDescription,
      openGraph: {
        title: post.title,
        description: post.excerpt || config.blogDescription,
        url,
        siteName: config.blogName,
        type: 'article',
        publishedTime: post.created_at,
        modifiedTime: post.modified_at,
        images,
      },
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title: post.title,
        description: post.excerpt || config.blogDescription,
        images,
      },
    };
  } catch {
    return {};
  }
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

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const slugPath = decodeURIComponent(slug.join('/'));

  let post = null;

  try {
    post = getPostBySlug(slugPath);
  } catch (error) {
    console.error('Error loading post:', error);
  }

  if (!post) {
    notFound();
  }

  const isModified = post.created_at !== post.modified_at;

  // Remove first h1 title and hashtag lines from content for display
  const lines = post.content.split('\n');
  let firstH1Removed = false;
  const contentWithoutHashtags = lines
    .filter((line) => {
      // Remove first # title if exists
      if (!firstH1Removed && line.trim().match(/^#\s+.+$/)) {
        firstH1Removed = true;
        return false;
      }
      // Remove hashtag-only lines
      return !line.trim().match(/^#\S+(\s+#\S+)*$/);
    })
    .join('\n');

  // Build category breadcrumb
  const categoryParts = post.category ? post.category.split('/') : [];
  const categoryBreadcrumbs = categoryParts.map((part, index) => ({
    name: part,
    path: categoryParts.slice(0, index + 1).join('/'),
  }));

  return (
    <Box>
      <Box
        mb="6"
        py="4"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-3)',
          overflow: 'hidden',
        }}
      >
        {post.thumbnail && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${getThumbnailUrl(post.thumbnail)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.1,
              zIndex: 0,
            }}
          />
        )}
        <Box style={{ position: 'relative', zIndex: 1 }}>
          <Heading size="8" mb="2">
            {post.title}
          </Heading>

          {/* Category breadcrumb */}
          {categoryBreadcrumbs.length > 0 && (
            <Flex align="center" gap="1" mb="4" wrap="wrap">
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Text size="2" color="gray">전체</Text>
              </Link>
              {categoryBreadcrumbs.map((crumb) => (
                <Flex key={crumb.path} align="center" gap="1">
                  <ChevronRightIcon width="12" height="12" color="gray" />
                  <Link
                    href={`/category/${encodeURIComponent(crumb.path)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Text size="2" color="gray">{crumb.name}</Text>
                  </Link>
                </Flex>
              ))}
            </Flex>
          )}

          <Flex gap="4" mb="4" wrap="wrap" align="center">
            <Flex align="center" gap="1">
              <CalendarIcon />
              <Text size="2" color="gray">
                {formatDate(post.created_at)}
              </Text>
            </Flex>

            {isModified && (
              <Text size="2" color="gray">
                (수정: {formatDate(post.modified_at)})
              </Text>
            )}

            <Flex align="center" gap="1">
              <ClockIcon />
              <Text size="2" color="gray">
                {post.reading_time}분 소요
              </Text>
            </Flex>

            <ShareButton title={post.title} />
          </Flex>

          {post.hashtags.length > 0 && (
            <Box mb="4">
              <HashtagList hashtags={post.hashtags} />
            </Box>
          )}
        </Box>
        <Separator size="4" />
      </Box>

      <MarkdownRenderer content={contentWithoutHashtags} slug={post.slug} />

      {post.hashtags.length > 0 && (
        <Box mt="8" pt="6" style={{ borderTop: '1px solid var(--gray-4)' }}>
          <Text size="2" color="gray" mb="2" as="div">
            태그
          </Text>
          <HashtagList hashtags={post.hashtags} />
        </Box>
      )}

      <Comments />
    </Box>
  );
}
