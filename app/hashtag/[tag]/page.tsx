import { getPostsByHashtag, getPostsCountByHashtag } from '@/lib/posts';
import { PostList } from '@/components/PostList';
import { Box, Flex, Heading, Badge, Text } from '@radix-ui/themes';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface HashtagPageProps {
  params: Promise<{ tag: string }>;
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  let posts = [];
  let totalCount = 0;

  try {
    posts = getPostsByHashtag(decodedTag, config.postsPerPage, 0);
    totalCount = getPostsCountByHashtag(decodedTag);
  } catch (error) {
    console.error('Error loading posts by hashtag:', error);
  }

  return (
    <Box>
      <Flex align="center" gap="3" mb="6">
        <Heading size="6">
          <Badge size="3" variant="soft" color="gray">
            #{decodedTag}
          </Badge>
        </Heading>
        <Text color="gray" size="2">
          {totalCount}개의 글
        </Text>
      </Flex>

      <PostList posts={posts} />
    </Box>
  );
}
