import { getAllPosts } from '@/lib/posts';
import { PostList } from '@/components/PostList';
import { Box, Heading } from '@radix-ui/themes';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function Home() {
  let posts = [];

  try {
    posts = getAllPosts(config.postsPerPage, 0);
  } catch (error) {
    console.error('Error loading posts:', error);
  }

  return (
    <Box>
      <PostList posts={posts} />
    </Box>
  );
}
