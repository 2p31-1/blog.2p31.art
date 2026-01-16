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

export function searchHashtags(query: string, limit: number = 10): { name: string; count: number }[] {
  const db = getDb();

  return db.prepare(`
    SELECT h.name, COUNT(ph.post_id) as count
    FROM hashtags h
    LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
    WHERE h.name LIKE ?
    GROUP BY h.id
    ORDER BY count DESC, h.name ASC
    LIMIT ?
  `).all(`%${query}%`, limit) as { name: string; count: number }[];
}
