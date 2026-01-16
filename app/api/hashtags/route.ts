import { NextRequest, NextResponse } from 'next/server';
import { getHashtagsWithCount, searchHashtags } from '@/lib/hashtags';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  try {
    if (query) {
      const hashtags = searchHashtags(query);
      return NextResponse.json({ hashtags });
    }

    const hashtags = getHashtagsWithCount();
    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error('Error fetching hashtags:', error);
    return NextResponse.json({ error: 'Failed to fetch hashtags' }, { status: 500 });
  }
}
