import { getDb, Hashtag } from './db';

export function getAllHashtags(): Hashtag[] {
  const db = getDb();

  return db.prepare(`
    SELECT * FROM hashtags ORDER BY name
  `).all() as Hashtag[];
}

export function getHashtagsWithCount(): { name: string; count: number }[] {
  const db = getDb();

  return db.prepare(`
    SELECT h.name, COUNT(ph.post_id) as count
    FROM hashtags h
    LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
    GROUP BY h.id
    ORDER BY count DESC, h.name
  `).all() as { name: string; count: number }[];
}

export function searchHashtags(query: string, limit: number = 10): string[] {
  const db = getDb();

  const hashtags = db.prepare(`
    SELECT name FROM hashtags
    WHERE name LIKE ?
    ORDER BY name
    LIMIT ?
  `).all(`%${query}%`, limit) as { name: string }[];

  return hashtags.map(h => h.name);
}
