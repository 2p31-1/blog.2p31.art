import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts, getTotalPostsCount } from '@/lib/posts';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const posts = getAllPosts(limit, offset);
    const total = getTotalPostsCount();

    return NextResponse.json({
      posts,
      total,
      hasMore: offset + posts.length < total,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
