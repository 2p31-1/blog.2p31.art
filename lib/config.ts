export const config = {
  blogName: process.env.NEXT_PUBLIC_BLOG_NAME || '개발 블로그',
  blogDescription: process.env.NEXT_PUBLIC_BLOG_DESCRIPTION || '개인 개발 블로그',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  postsPerPage: parseInt(process.env.NEXT_PUBLIC_POSTS_PER_PAGE || '20', 10),
};
