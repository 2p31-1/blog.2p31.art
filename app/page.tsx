import { getAllPosts } from '@/lib/posts';
import { PostWithHashtags } from '@/lib/db';
import { PostList } from '@/components/PostList';
import { CategoryTree } from '@/components/CategoryTree';
import { Box } from '@radix-ui/themes';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function Home() {
  let posts: PostWithHashtags[] = [];

  try {
    posts = getAllPosts(config.postsPerPage, 0);
  } catch (error) {
    console.error('Error loading posts:', error);
  }

  return (
    <Box>
      <CategoryTree />
      <PostList posts={posts} />
    </Box>
  );
}
