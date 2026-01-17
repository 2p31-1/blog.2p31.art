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

// Get all hashtags sorted by post count (most used first)
export function getAllHashtagsSorted(): { name: string; count: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT h.name, COUNT(ph.post_id) as count
    FROM hashtags h
    JOIN post_hashtags ph ON h.id = ph.hashtag_id
    GROUP BY h.id
    ORDER BY count DESC, h.name ASC
  `).all() as { name: string; count: number }[];
}

// Get all categories with post counts
export function getAllCategories(): { category: string; count: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT category, COUNT(*) as count
    FROM posts
    GROUP BY category
    ORDER BY category ASC
  `).all() as { category: string; count: number }[];
}

// Get posts by category (including subcategories)
export function getPostsByCategory(category: string, limit: number = 20, offset: number = 0): PostWithHashtags[] {
  const db = getDb();

  let posts: Post[];
  if (category === '') {
    // Root category (no category)
    posts = db.prepare(`
      SELECT * FROM posts
      WHERE category = ''
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Post[];
  } else {
    // Category and subcategories
    posts = db.prepare(`
      SELECT * FROM posts
      WHERE category = ? OR category LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(category, `${category}/%`, limit, offset) as Post[];
  }

  return posts.map(post => ({
    ...post,
    hashtags: getPostHashtags(post.id),
  }));
}

// Get post count by category (including subcategories)
export function getPostsCountByCategory(category: string): number {
  const db = getDb();

  if (category === '') {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM posts WHERE category = ''
    `).get() as { count: number };
    return result.count;
  }

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM posts
    WHERE category = ? OR category LIKE ?
  `).get(category, `${category}/%`) as { count: number };
  return result.count;
}

// Get all post slugs for SSG
export function getAllPostSlugs(): string[] {
  const db = getDb();
  const posts = db.prepare('SELECT slug FROM posts').all() as { slug: string }[];
  return posts.map(p => p.slug);
}

// Get all unique category paths for SSG
export function getAllCategoryPaths(): string[] {
  const db = getDb();
  const categories = db.prepare(`
    SELECT DISTINCT category FROM posts WHERE category != ''
  `).all() as { category: string }[];

  // 상위 카테고리도 포함 (예: "dev/web" -> ["dev", "dev/web"])
  const allPaths = new Set<string>();
  for (const { category } of categories) {
    const parts = category.split('/');
    for (let i = 1; i <= parts.length; i++) {
      allPaths.add(parts.slice(0, i).join('/'));
    }
  }
  return Array.from(allPaths);
}

// Get all hashtag names for SSG
export function getAllHashtagNames(): string[] {
  const db = getDb();
  const hashtags = db.prepare('SELECT name FROM hashtags').all() as { name: string }[];
  return hashtags.map(h => h.name);
}

// Search posts including category search
export function searchPostsWithCategory(query: string, limit: number = 10): PostWithHashtags[] {
  const db = getDb();

  const searchTerm = `%${query}%`;

  const posts = db.prepare(`
    SELECT DISTINCT p.* FROM posts p
    LEFT JOIN post_hashtags ph ON p.id = ph.post_id
    LEFT JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE p.title LIKE ? OR p.content LIKE ? OR h.name LIKE ? OR p.category LIKE ?
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(searchTerm, searchTerm, searchTerm, searchTerm, limit) as Post[];

  return posts.map(post => ({
    ...post,
    hashtags: getPostHashtags(post.id),
  }));
}
