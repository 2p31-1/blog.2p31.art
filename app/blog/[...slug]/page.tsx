import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getPostBySlug, getAllPostSlugs } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { HashtagList } from '@/components/HashtagList';
import { ShareButton } from '@/components/ShareButton';
import { TableOfContents } from '@/components/TableOfContents';
import { Comments } from '@/components/Comments';
import { Box, Flex, Heading, Text, Separator } from '@radix-ui/themes';
import { ClockIcon, CalendarIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { config } from '@/lib/config';

export const revalidate = false; // 완전 정적 (재배포 시에만 갱신)

// SSG: 빌드 시점에 모든 포스트 페이지 생성
export function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({
    slug: slug.split('/'),
  }));
}

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
  let inCodeBlock = false;
  let codeBlockFence = '';

  const contentWithoutHashtags = lines
    .filter((line) => {
      const trimmedLine = line.trim();

      // Track code block state
      const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockFence = fenceMatch[1][0];
        } else if (fenceMatch[1][0] === codeBlockFence) {
          inCodeBlock = false;
          codeBlockFence = '';
        }
        return true; // Keep fence lines
      }

      // Don't process lines inside code blocks
      if (inCodeBlock) {
        return true;
      }

      // Remove first # title if exists (only outside code blocks)
      if (!firstH1Removed && trimmedLine.match(/^#\s+.+$/)) {
        firstH1Removed = true;
        return false;
      }

      // Remove hashtag-only lines
      return !trimmedLine.match(/^#\S+(\s+#\S+)*$/);
    })
    .join('\n');

  // 첫 heading 위치 찾기 (코드 블록 외부에서만)
  const contentLines = contentWithoutHashtags.split('\n');
  inCodeBlock = false;
  codeBlockFence = '';
  const firstHeadingIndex = contentLines.findIndex((line) => {
    const trimmedLine = line.trim();

    // Track code block state
    const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockFence = fenceMatch[1][0];
      } else if (fenceMatch[1][0] === codeBlockFence) {
        inCodeBlock = false;
        codeBlockFence = '';
      }
      return false;
    }

    // Only match headings outside code blocks
    if (inCodeBlock) {
      return false;
    }

    return /^#{1,6}\s+.+$/.test(trimmedLine);
  });

  // 첫 heading 기준으로 콘텐츠 분리
  const beforeHeading = firstHeadingIndex > 0 ? contentLines.slice(0, firstHeadingIndex).join('\n') : '';
  const fromHeading = firstHeadingIndex >= 0 ? contentLines.slice(firstHeadingIndex).join('\n') : contentWithoutHashtags;

  // Build category breadcrumb
  const categoryParts = post.category ? post.category.split('/') : [];
  const categoryBreadcrumbs = categoryParts.map((part, index) => ({
    name: part,
    path: categoryParts.slice(0, index + 1).join('/'),
  }));

  return (
    <article className="blog-post-layout">
      {/* 헤더 영역 */}
      <header
        className="blog-post-header"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-3)',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-4) 0',
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
            <nav aria-label="breadcrumb">
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
            </nav>
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
      </header>

      {/* 본문 */}
      {beforeHeading && <MarkdownRenderer content={beforeHeading} slug={post.slug} />}
      <TableOfContents content={contentWithoutHashtags} variant="mobile" />
      <MarkdownRenderer content={fromHeading} slug={post.slug} />

      {post.hashtags.length > 0 && (
        <Box mt="8" pt="6" style={{ borderTop: '1px solid var(--gray-4)' }}>
          <Text size="2" color="gray" mb="2" as="div">
            태그
          </Text>
          <HashtagList hashtags={post.hashtags} />
        </Box>
      )}

      <Comments />

      {/* PC 사이드 목차 */}
      <aside className="blog-post-sidebar">
        <TableOfContents content={contentWithoutHashtags} variant="desktop" />
      </aside>
    </article>
  );
}
