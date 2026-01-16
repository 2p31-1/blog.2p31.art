import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const MD_DIR = path.join(process.cwd(), 'md');
const DB_PATH = path.join(process.cwd(), 'data', 'blog.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Delete existing database
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    reading_time INTEGER NOT NULL
  );

  CREATE TABLE hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE post_hashtags (
    post_id INTEGER NOT NULL,
    hashtag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_posts_created ON posts(created_at DESC);
  CREATE INDEX idx_posts_modified ON posts(modified_at DESC);
  CREATE INDEX idx_hashtags_name ON hashtags(name);
`);

// Calculate reading time (minutes)
function calculateReadingTime(content: string): number {
  // Remove markdown syntax for accurate count
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[.*?\]\(.*?\)/g, '') // links
    .replace(/[#*_~>`-]/g, '') // markdown symbols
    .trim();

  // Count Korean characters
  const koreanChars = (plainText.match(/[가-힣]/g) || []).length;

  // Count English words
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;

  // Korean: ~500 chars/min, English: ~200 words/min
  const koreanMinutes = koreanChars / 500;
  const englishMinutes = englishWords / 200;

  return Math.max(1, Math.ceil(koreanMinutes + englishMinutes));
}

// Extract title from content (first # heading or filename)
function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return filename.replace(/\.md$/, '');
}

// Extract hashtags from content (at the end of file)
function extractHashtags(content: string): string[] {
  const lines = content.trim().split('\n');
  const lastLines = lines.slice(-5).join('\n'); // Check last 5 lines
  const hashtags = lastLines.match(/#([가-힣a-zA-Z0-9_]+)/g) || [];
  return [...new Set(hashtags.map(tag => tag.substring(1)))];
}

// Extract first image from content
function extractThumbnail(content: string): string | null {
  // Match markdown image syntax: ![alt](url)
  const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (match) {
    return match[1];
  }
  return null;
}

// Extract excerpt (first paragraph after title)
function extractExcerpt(content: string): string {
  const lines = content.split('\n');
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      foundTitle = true;
      continue;
    }
    if (foundTitle || !content.includes('# ')) {
      // Remove markdown formatting
      const cleaned = trimmed
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`]/g, '')
        .trim();
      if (cleaned && !cleaned.startsWith('#')) {
        return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
      }
    }
  }
  return '';
}

// Get all markdown files recursively
function getMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Prepare statements
const insertPost = db.prepare(`
  INSERT INTO posts (slug, title, content, excerpt, thumbnail, created_at, modified_at, reading_time)
  VALUES (@slug, @title, @content, @excerpt, @thumbnail, @created_at, @modified_at, @reading_time)
`);

const insertHashtag = db.prepare(`
  INSERT OR IGNORE INTO hashtags (name) VALUES (@name)
`);

const getHashtagId = db.prepare(`
  SELECT id FROM hashtags WHERE name = ?
`);

const insertPostHashtag = db.prepare(`
  INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)
`);

// Process all markdown files
const files = getMarkdownFiles(MD_DIR);
console.log(`Found ${files.length} markdown files`);

for (const filePath of files) {
  const relativePath = path.relative(MD_DIR, filePath);
  const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = fs.statSync(filePath);

  const title = extractTitle(content, path.basename(filePath));
  const excerpt = extractExcerpt(content);
  const thumbnail = extractThumbnail(content);
  const hashtags = extractHashtags(content);
  const readingTime = calculateReadingTime(content);

  // Use birthtime for created_at, mtime for modified_at
  const createdAt = stats.birthtime.toISOString();
  const modifiedAt = stats.mtime.toISOString();

  try {
    const result = insertPost.run({
      slug,
      title,
      content,
      excerpt,
      thumbnail,
      created_at: createdAt,
      modified_at: modifiedAt,
      reading_time: readingTime,
    });

    const postId = result.lastInsertRowid;

    // Insert hashtags
    for (const tag of hashtags) {
      insertHashtag.run({ name: tag });
      const hashtagRow = getHashtagId.get(tag) as { id: number };
      if (hashtagRow) {
        insertPostHashtag.run(postId, hashtagRow.id);
      }
    }

    console.log(`Processed: ${slug} (${hashtags.length} hashtags, ${readingTime} min read)`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

db.close();
console.log(`\nDatabase created at ${DB_PATH}`);
