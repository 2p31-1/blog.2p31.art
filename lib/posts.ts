import { getDb, Post, PostWithHashtags } from './db';

export function getAllPosts(limit: number = 20, offset: number = 0): PostWithHashtags[] {
  const db = getDb();

  const posts = db.prepare(`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Post[];

  return posts.map(post => ({
    ...post,
    hashtags: getPostHashtags(post.id),
  }));
}

export function getPostBySlug(slug: string): PostWithHashtags | null {
  const db = getDb();

  const post = db.prepare(`
    SELECT * FROM posts WHERE slug = ?
  `).get(slug) as Post | undefined;

  if (!post) return null;

  return {
    ...post,
    hashtags: getPostHashtags(post.id),
  };
}

export function getPostHashtags(postId: number): string[] {
  const db = getDb();

  const hashtags = db.prepare(`
    SELECT h.name FROM hashtags h
    JOIN post_hashtags ph ON h.id = ph.hashtag_id
    WHERE ph.post_id = ?
  `).all(postId) as { name: string }[];

  return hashtags.map(h => h.name);
}

export function searchPosts(query: string, limit: number = 10): PostWithHashtags[] {
  const db = getDb();

  const searchTerm = `%${query}%`;

  const posts = db.prepare(`
    SELECT DISTINCT p.* FROM posts p
    LEFT JOIN post_hashtags ph ON p.id = ph.post_id
    LEFT JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE p.title LIKE ? OR p.content LIKE ? OR h.name LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(searchTerm, searchTerm, searchTerm, limit) as Post[];

  return posts.map(post => ({
    ...post,
    hashtags: getPostHashtags(post.id),
  }));
}

export function getPostsByHashtag(hashtag: string, limit: number = 20, offset: number = 0): PostWithHashtags[] {
  const db = getDb();

  const posts = db.prepare(`
    SELECT p.* FROM posts p
    JOIN post_hashtags ph ON p.id = ph.post_id
    JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE h.name = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(hashtag, limit, offset) as Post[];

  return posts.map(post => ({
    ...post,
    hashtags: getPostHashtags(post.id),
  }));
}

export function getTotalPostsCount(): number {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  return result.count;
}

export function getPostsCountByHashtag(hashtag: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM posts p
    JOIN post_hashtags ph ON p.id = ph.post_id
    JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE h.name = ?
  `).get(hashtag) as { count: number };
  return result.count;
}
