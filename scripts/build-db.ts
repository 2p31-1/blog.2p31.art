import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const MD_DIR = path.join(process.cwd(), 'md');
const DB_PATH = path.join(process.cwd(), 'data', 'blog.db');
const PUBLIC_MD_DIR = path.join(process.cwd(), 'public', 'md');

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

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
    blur_data_url TEXT,
    category TEXT NOT NULL DEFAULT '',
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
    return match[1].trim();
  }
  return filename.replace(/\.md$/, '');
}

// Extract hashtags from content (at the end of file)
function extractHashtags(content: string): string[] {
  const lines = content.trim().split('\n');
  const lastLines = lines.slice(-5).join('\n'); // Check last 5 lines
  const hashtags = lastLines.match(/#([가-힣a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(hashtags.map(tag => tag.substring(1))));
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

// Generate blurDataURL from image
async function generateBlurDataURL(imagePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(imagePath)) {
      return null;
    }

    const buffer = await sharp(imagePath)
      .resize(10, 10, { fit: 'cover' })
      .blur()
      .toBuffer();

    const base64 = buffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.warn(`Failed to generate blur for ${imagePath}:`, error);
    return null;
  }
}

// Get full image path from thumbnail
function getImagePath(thumbnail: string, slug: string): string | null {
  if (thumbnail.startsWith('http')) {
    return null; // 외부 URL은 blur 생성 불가
  }

  // 썸네일 경로에서 실제 파일 경로 계산
  const imagePath = path.join(MD_DIR, thumbnail);
  if (fs.existsSync(imagePath)) {
    return imagePath;
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

// Get all image files recursively
function getImageFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getImageFiles(fullPath, baseDir));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (imageExtensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Generate blur data for all images and save to JSON
async function generateAllBlurData(): Promise<Record<string, string>> {
  const imageFiles = getImageFiles(MD_DIR);
  const blurData: Record<string, string> = {};

  console.log(`Generating blur data for ${imageFiles.length} images...`);

  for (const imagePath of imageFiles) {
    const relativePath = path.relative(MD_DIR, imagePath).replace(/\\/g, '/');
    const webPath = `/md/${encodeURIComponent(relativePath).replace(/%2F/g, '/')}`;

    const blur = await generateBlurDataURL(imagePath);
    if (blur) {
      blurData[webPath] = blur;
    }
  }

  // Save to public/blur-data.json
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(publicDir, 'blur-data.json'),
    JSON.stringify(blurData),
    'utf-8'
  );

  console.log(`Generated blur data for ${Object.keys(blurData).length} images`);
  return blurData;
}

// Prepare statements
const insertPost = db.prepare(`
  INSERT INTO posts (slug, title, content, excerpt, thumbnail, blur_data_url, category, created_at, modified_at, reading_time)
  VALUES (@slug, @title, @content, @excerpt, @thumbnail, @blur_data_url, @category, @created_at, @modified_at, @reading_time)
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
const configPath = path.join(process.cwd(), '.env.local');
const envPath = fs.existsSync(configPath) ? configPath : path.join(process.cwd(), '.env');
let blogName = '개발 블로그';
let blogDescription = '개인 개발 블로그';
let siteUrl = 'https://example.com';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const nameMatch = envContent.match(/NEXT_PUBLIC_BLOG_NAME=(.+)/);
  const descMatch = envContent.match(/NEXT_PUBLIC_BLOG_DESCRIPTION=(.+)/);
  const urlMatch = envContent.match(/NEXT_PUBLIC_SITE_URL=(.+)/);
  if (nameMatch) blogName = nameMatch[1].trim();
  if (descMatch) blogDescription = descMatch[1].trim();
  if (urlMatch) siteUrl = urlMatch[1].trim();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Process all markdown files
async function processFiles() {
  const files = getMarkdownFiles(MD_DIR);
  console.log(`Found ${files.length} markdown files`);

  const postsForFeed: Array<{
    slug: string;
    title: string;
    excerpt: string;
    created_at: string;
  }> = [];

  for (const filePath of files) {
    const relativePath = path.relative(MD_DIR, filePath);
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    const title = extractTitle(content, path.basename(filePath));
    const excerpt = extractExcerpt(content);
    const thumbnail = extractThumbnail(content, slug);
    const category = extractCategory(slug);
    const hashtags = extractHashtags(content);
    const readingTime = calculateReadingTime(content);

    // Use birthtime for created_at, mtime for modified_at
    const createdAt = stats.birthtime.toISOString();
    const modifiedAt = stats.mtime.toISOString();

    // Generate blurDataURL for thumbnail
    let blurDataUrl: string | null = null;
    if (thumbnail) {
      const imagePath = getImagePath(thumbnail, slug);
      if (imagePath) {
        blurDataUrl = await generateBlurDataURL(imagePath);
      }
    }

    try {
      const result = insertPost.run({
        slug,
        title,
        content,
        excerpt,
        thumbnail,
        blur_data_url: blurDataUrl,
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

      // Add to feed list
      postsForFeed.push({ slug, title, excerpt, created_at: createdAt });

      const blurStatus = blurDataUrl ? '✓ blur' : '';
      console.log(`Processed: ${slug} (${category || '없음'}, ${hashtags.length} tags, ${readingTime}min ${blurStatus})`);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
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

// Run
async function main() {
  copyMdToPublic();
  await generateAllBlurData();
  await processFiles();
}

main();
