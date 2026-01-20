import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const MD_DIR = path.join(process.cwd(), 'md');
const DB_PATH = path.join(process.cwd(), 'data', 'blog.db');
const PUBLIC_MD_DIR = path.join(process.cwd(), 'public', 'md');

// Parse frontmatter dates from markdown content
// Expected format:
// ---
// created: 2025-01-19
// modified: 2025-01-20
// ---
function parseFrontmatterDates(content: string): { created: string | null; modified: string | null } {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return { created: null, modified: null };
  }

  const frontmatter = frontmatterMatch[1];
  const createdMatch = frontmatter.match(/^created:\s*(.+)$/m);
  const modifiedMatch = frontmatter.match(/^modified:\s*(.+)$/m);

  const parseDate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    // Support formats: 2025-01-19, 2025-01-19 14:30, 2025-01-19T14:30:00
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };

  return {
    created: parseDate(createdMatch?.[1]),
    modified: parseDate(modifiedMatch?.[1]),
  };
}

// Remove frontmatter from content for storage
function removeFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Copy md folder to public/md for static serving
function copyMdToPublic() {
  // Remove existing public/md
  if (fs.existsSync(PUBLIC_MD_DIR)) {
    fs.rmSync(PUBLIC_MD_DIR, { recursive: true });
  }

  // Copy md to public/md
  copyDirRecursive(MD_DIR, PUBLIC_MD_DIR);
  console.log('Copied md folder to public/md');
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  // NFC 정규화된 이름으로 그룹화 (중복 처리)
  const normalizedEntries = new Map<string, { entry: fs.Dirent; srcPath: string; mtime: Date }>();

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const normalizedName = entry.name.normalize('NFC');
    const stats = fs.statSync(srcPath);

    const existing = normalizedEntries.get(normalizedName);
    if (!existing || stats.mtime > existing.mtime) {
      normalizedEntries.set(normalizedName, { entry, srcPath, mtime: stats.mtime });
    }
  }

  normalizedEntries.forEach(({ entry, srcPath }, normalizedName) => {
    const destPath = path.join(dest, normalizedName);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
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
    category TEXT NOT NULL DEFAULT '',
    created_at TEXT,
    modified_at TEXT,
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
  CREATE INDEX idx_posts_category ON posts(category);
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
    return match[1].trim().normalize('NFC');
  }
  return filename.replace(/\.md$/, '').normalize('NFC');
}

// Extract hashtags from content (at the end of file)
function extractHashtags(content: string): string[] {
  const lines = content.trim().split('\n');
  const lastLines = lines.slice(-5).join('\n'); // Check last 5 lines
  const hashtags = lastLines.match(/#([가-힣a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(hashtags.map(tag => tag.substring(1).normalize('NFC'))));
}

// Extract first image from content with resolved path
function extractThumbnail(content: string, slug: string): string | null {
  // Match markdown image syntax: ![alt](url)
  const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (match) {
    const imagePath = match[1];
    // If it's an absolute URL, return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    // Get directory from slug (e.g., "분류1/a" -> "분류1")
    const slugDir = slug.includes('/') ? slug.substring(0, slug.lastIndexOf('/')) : '';
    // Combine slug directory with image path
    return slugDir ? `${slugDir}/${imagePath}` : imagePath;
  }
  return null;
}

// Extract category from slug (directory path)
function extractCategory(slug: string): string {
  const parts = slug.split('/');
  if (parts.length <= 1) {
    return ''; // No category (root level)
  }
  return parts.slice(0, -1).join('/');
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
        .trim()
        .normalize('NFC');
      if (cleaned && !cleaned.startsWith('#')) {
        return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
      }
    }
  }
  return '';
}

// Get all markdown files recursively
function getMarkdownFiles(dir: string, baseDir: string = dir): { filePath: string; mtime: Date }[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: { filePath: string; mtime: Date }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md')) {
      const stats = fs.statSync(fullPath);
      files.push({ filePath: fullPath, mtime: stats.mtime });
    }
  }

  return files;
}

// Normalize path to NFC (for Korean characters on macOS)
function normalizeSlug(filePath: string, baseDir: string): string {
  const relativePath = path.relative(baseDir, filePath);
  return relativePath
    .split(path.sep)
    .map(p => p.normalize('NFC'))
    .join('/')
    .replace(/\.md$/, '');
}

// Prepare statements
const insertPost = db.prepare(`
  INSERT INTO posts (slug, title, content, excerpt, thumbnail, category, created_at, modified_at, reading_time)
  VALUES (@slug, @title, @content, @excerpt, @thumbnail, @category, @created_at, @modified_at, @reading_time)
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

// Load config for feed.xml generation
// Priority: process.env (Vercel) > .env.local > .env > defaults
let blogName = process.env.NEXT_PUBLIC_BLOG_NAME || '';
let blogDescription = process.env.NEXT_PUBLIC_BLOG_DESCRIPTION || '';
let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

// Fallback to .env files if env vars not set (local development)
if (!blogName || !blogDescription || !siteUrl) {
  const configPath = path.join(process.cwd(), '.env.local');
  const envPath = fs.existsSync(configPath) ? configPath : path.join(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (!blogName) {
      const nameMatch = envContent.match(/NEXT_PUBLIC_BLOG_NAME=(.+)/);
      if (nameMatch) blogName = nameMatch[1].trim();
    }
    if (!blogDescription) {
      const descMatch = envContent.match(/NEXT_PUBLIC_BLOG_DESCRIPTION=(.+)/);
      if (descMatch) blogDescription = descMatch[1].trim();
    }
    if (!siteUrl) {
      const urlMatch = envContent.match(/NEXT_PUBLIC_SITE_URL=(.+)/);
      if (urlMatch) siteUrl = urlMatch[1].trim();
    }
  }
}

// Final defaults
blogName = blogName || '개발 블로그';
blogDescription = blogDescription || '개인 개발 블로그';
siteUrl = siteUrl || 'https://example.com';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Process all markdown files
function processFiles() {
  const files = getMarkdownFiles(MD_DIR);
  console.log(`Found ${files.length} markdown files`);

  // Group by normalized slug, keep newest by mtime
  const filesBySlug = new Map<string, { filePath: string; mtime: Date }>();
  for (const { filePath, mtime } of files) {
    const slug = normalizeSlug(filePath, MD_DIR);
    const existing = filesBySlug.get(slug);
    if (!existing || mtime > existing.mtime) {
      filesBySlug.set(slug, { filePath, mtime });
    }
  }

  console.log(`After deduplication: ${filesBySlug.size} unique posts`);

  const postsForFeed: Array<{
    slug: string;
    title: string;
    excerpt: string;
    created_at: string | null;
  }> = [];

  const missingDates: string[] = [];

  Array.from(filesBySlug.entries()).forEach(([slug, { filePath }]) => {
    const rawContent = fs.readFileSync(filePath, 'utf-8').normalize('NFC');

    // Parse frontmatter dates
    const dates = parseFrontmatterDates(rawContent);
    const createdAt = dates.created;
    const modifiedAt = dates.modified || dates.created; // fallback to created if no modified

    // Log warning for missing dates
    if (!createdAt) {
      missingDates.push(slug);
    }

    // Remove frontmatter from content for storage
    const content = removeFrontmatter(rawContent);

    const title = extractTitle(content, path.basename(filePath));
    const excerpt = extractExcerpt(content);
    const thumbnail = extractThumbnail(content, slug);
    const category = extractCategory(slug);
    const hashtags = extractHashtags(content);
    const readingTime = calculateReadingTime(content);

    try {
      const result = insertPost.run({
        slug,
        title,
        content,
        excerpt,
        thumbnail,
        category,
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

      // Add to feed list (only if has date)
      if (createdAt) {
        postsForFeed.push({ slug, title, excerpt, created_at: createdAt });
      }

      console.log(`Processed: ${slug} (${category || 'root'}, ${hashtags.length} tags, ${readingTime}min)`);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  });

  // Log files missing dates
  if (missingDates.length > 0) {
    console.log(`\n⚠️  Missing dates in ${missingDates.length} file(s):`);
    missingDates.forEach(slug => console.log(`   - ${slug}`));
    console.log(`\n   Add frontmatter at the top of each file:`);
    console.log(`   ---`);
    console.log(`   created: 2025-01-19`);
    console.log(`   modified: 2025-01-20`);
    console.log(`   ---`);
  }

  // Generate feed.xml
  generateFeedXml(postsForFeed);

  db.close();
  console.log(`\nDatabase created at ${DB_PATH}`);
}

// Generate static feed.xml
function generateFeedXml(posts: Array<{ slug: string; title: string; excerpt: string; created_at: string }>) {
  // Sort by created_at descending
  const sortedPosts = posts.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 50);

  const rssItems = sortedPosts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`;
      const pubDate = new Date(post.created_at).toUTCString();

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(blogName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(blogDescription)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>${rssItems}
  </channel>
</rss>`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'feed.xml'), rss, 'utf-8');
  console.log(`\nGenerated feed.xml with ${sortedPosts.length} items`);
}

// Generate pagination JSON files
function generatePaginationData() {
  const postsPerPage = 20;
  const dataDir = path.join(process.cwd(), 'public', 'data');

  // Ensure data directory exists and clean it
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });

  // Helper to write JSON
  const writeJson = (filePath: string, data: unknown) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  };

  // Helper to get post data without content (for list)
  const getPostListData = (post: {
    slug: string;
    title: string;
    excerpt: string;
    thumbnail: string | null;
    category: string;
    created_at: string | null;
    modified_at: string | null;
    reading_time: number;
    hashtags: string[];
  }) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    thumbnail: post.thumbnail,
    category: post.category,
    created_at: post.created_at,
    modified_at: post.modified_at,
    reading_time: post.reading_time,
    hashtags: post.hashtags,
  });

  // Re-open database for reading
  const readDb = new Database(DB_PATH, { readonly: true });

  // Get all posts with hashtags
  const getAllPostsWithHashtags = (limit: number, offset: number) => {
    const posts = readDb.prepare(`
      SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as Array<{
      id: number;
      slug: string;
      title: string;
      excerpt: string;
      thumbnail: string | null;
      category: string;
      created_at: string | null;
      modified_at: string | null;
      reading_time: number;
    }>;

    return posts.map(post => {
      const hashtags = readDb.prepare(`
        SELECT h.name FROM hashtags h
        JOIN post_hashtags ph ON h.id = ph.hashtag_id
        WHERE ph.post_id = ?
      `).all(post.id) as { name: string }[];
      return { ...post, hashtags: hashtags.map(h => h.name) };
    });
  };

  // 1. Generate main posts pagination
  const totalPosts = (readDb.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number }).count;
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  console.log(`\nGenerating pagination data...`);

  for (let page = 1; page <= totalPages; page++) {
    const offset = (page - 1) * postsPerPage;
    const posts = getAllPostsWithHashtags(postsPerPage, offset);
    writeJson(path.join(dataDir, 'posts', `page-${page}.json`), {
      posts: posts.map(getPostListData),
      page,
      totalPages,
      totalPosts,
      hasMore: page < totalPages,
    });
  }
  console.log(`  - posts: ${totalPages} pages`);

  // 2. Generate category pagination
  const categories = readDb.prepare(`
    SELECT DISTINCT category FROM posts WHERE category != ''
  `).all() as { category: string }[];

  // Get all unique category paths (including parent categories)
  const allCategoryPaths = new Set<string>();
  for (const { category } of categories) {
    const parts = category.split('/');
    for (let i = 1; i <= parts.length; i++) {
      allCategoryPaths.add(parts.slice(0, i).join('/'));
    }
  }

  for (const categoryPath of Array.from(allCategoryPaths)) {
    const categoryTotal = (readDb.prepare(`
      SELECT COUNT(*) as count FROM posts WHERE category = ? OR category LIKE ?
    `).get(categoryPath, `${categoryPath}/%`) as { count: number }).count;

    const categoryTotalPages = Math.ceil(categoryTotal / postsPerPage);

    for (let page = 1; page <= categoryTotalPages; page++) {
      const offset = (page - 1) * postsPerPage;
      const posts = readDb.prepare(`
        SELECT * FROM posts WHERE category = ? OR category LIKE ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(categoryPath, `${categoryPath}/%`, postsPerPage, offset) as Array<{
        id: number;
        slug: string;
        title: string;
        excerpt: string;
        thumbnail: string | null;
        category: string;
        created_at: string | null;
        modified_at: string | null;
        reading_time: number;
      }>;

      const postsWithHashtags = posts.map(post => {
        const hashtags = readDb.prepare(`
          SELECT h.name FROM hashtags h
          JOIN post_hashtags ph ON h.id = ph.hashtag_id
          WHERE ph.post_id = ?
        `).all(post.id) as { name: string }[];
        return { ...post, hashtags: hashtags.map(h => h.name) };
      });

      writeJson(path.join(dataDir, 'category', categoryPath, `page-${page}.json`), {
        posts: postsWithHashtags.map(getPostListData),
        page,
        totalPages: categoryTotalPages,
        totalPosts: categoryTotal,
        hasMore: page < categoryTotalPages,
        category: categoryPath,
      });
    }
  }
  console.log(`  - categories: ${allCategoryPaths.size} categories`);

  // 3. Generate hashtag pagination
  const hashtags = readDb.prepare('SELECT name FROM hashtags').all() as { name: string }[];

  for (const { name: hashtag } of hashtags) {
    const hashtagTotal = (readDb.prepare(`
      SELECT COUNT(*) as count FROM posts p
      JOIN post_hashtags ph ON p.id = ph.post_id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.name = ?
    `).get(hashtag) as { count: number }).count;

    const hashtagTotalPages = Math.ceil(hashtagTotal / postsPerPage);

    for (let page = 1; page <= hashtagTotalPages; page++) {
      const offset = (page - 1) * postsPerPage;
      const posts = readDb.prepare(`
        SELECT p.* FROM posts p
        JOIN post_hashtags ph ON p.id = ph.post_id
        JOIN hashtags h ON ph.hashtag_id = h.id
        WHERE h.name = ?
        ORDER BY p.created_at DESC LIMIT ? OFFSET ?
      `).all(hashtag, postsPerPage, offset) as Array<{
        id: number;
        slug: string;
        title: string;
        excerpt: string;
        thumbnail: string | null;
        category: string;
        created_at: string | null;
        modified_at: string | null;
        reading_time: number;
      }>;

      const postsWithHashtags = posts.map(post => {
        const postHashtags = readDb.prepare(`
          SELECT h.name FROM hashtags h
          JOIN post_hashtags ph ON h.id = ph.hashtag_id
          WHERE ph.post_id = ?
        `).all(post.id) as { name: string }[];
        return { ...post, hashtags: postHashtags.map(h => h.name) };
      });

      writeJson(path.join(dataDir, 'hashtag', hashtag, `page-${page}.json`), {
        posts: postsWithHashtags.map(getPostListData),
        page,
        totalPages: hashtagTotalPages,
        totalPosts: hashtagTotal,
        hasMore: page < hashtagTotalPages,
        hashtag,
      });
    }
  }
  console.log(`  - hashtags: ${hashtags.length} hashtags`);

  readDb.close();
  console.log(`Pagination data generated in public/data/`);
}

// Run
function main() {
  copyMdToPublic();
  processFiles();
  generatePaginationData();
}

main();
