import { getAllPosts, getTotalPostsCount } from '@/lib/posts';
import { PostWithHashtags } from '@/lib/db';
import { PostList } from '@/components/PostList';
import { CategoryTree } from '@/components/CategoryTree';
import { Box } from '@radix-ui/themes';
import { config } from '@/lib/config';

export const revalidate = false; // 완전 정적 (재배포 시에만 갱신)

export default function Home() {
  let posts: PostWithHashtags[] = [];
  let totalPosts = 0;

  try {
    posts = getAllPosts(config.postsPerPage, 0);
    totalPosts = getTotalPostsCount();
  } catch (error) {
    console.error('Error loading posts:', error);
  }

  const totalPages = Math.ceil(totalPosts / config.postsPerPage);
  const hasMore = totalPosts > config.postsPerPage;

  return (
    <Box>
      <CategoryTree />
      <PostList
        posts={posts}
        paginationPath="/data/posts"
        initialPage={1}
        totalPages={totalPages}
        hasMore={hasMore}
      />
    </Box>
  );
}
