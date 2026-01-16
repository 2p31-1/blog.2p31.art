import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'blog.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  thumbnail: string | null;
  category: string;
  created_at: string;
  modified_at: string;
  reading_time: number;
}

export interface Hashtag {
  id: number;
  name: string;
}

export interface PostWithHashtags extends Post {
  hashtags: string[];
}
