import { NextRequest, NextResponse } from 'next/server';
import { searchPostsWithCategory } from '@/lib/posts';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!query.trim()) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const posts = searchPostsWithCategory(query, limit);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error searching posts:', error);
    return NextResponse.json({ error: 'Failed to search posts' }, { status: 500 });
  }
}
