import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://vitalik.eth.limo';
const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const CATEGORY_PAGES = [
  'general',
  'blockchains',
  'cryptography',
  'economics',
  'philosophy',
  'math',
  'fun'
];

async function generateOneSentenceSummary(content, title) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_api_key_here') {
    return null;
  }

  // Truncate content to ~10k chars for the summary
  const truncatedContent = content.slice(0, 10000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Summarize this blog post by Vitalik in exactly one sentence (max 150 characters). Be specific about the main point, not generic. Refer to the author as "Vitalik", never "the author" or "Vitalik Buterin".\n\nBlog title: "${title}"\n\nContent:\n${truncatedContent}`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`    API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.log(`    Summary generation failed: ${error.message}`);
    return null;
  }
}

async function generateDetailedSummary(content, title) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your_api_key_here') {
    return null;
  }

  // Truncate content to ~50k chars for detailed analysis
  const truncatedContent = content.slice(0, 50000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Analyze this blog post by Vitalik titled "${title}".

IMPORTANT: Refer to the author as "Vitalik", never "the author" or "Vitalik Buterin".

Blog Content:
${truncatedContent}

Respond in the following JSON format only (no markdown code blocks, just the raw JSON):
{
  "theme": "A one-sentence description of the main theme/topic",
  "summary": "A 2-3 paragraph summary of the key points and arguments. Use 'Vitalik' not 'the author'.",
  "takeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4", "Key takeaway 5"],
  "controversial": ["Any potentially controversial or debatable point 1", "Point 2"]
}

If there are no controversial points, use an empty array for "controversial".`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`    API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.log(`    Detailed summary generation failed: ${error.message}`);
    return null;
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function parseHomepage(html) {
  const blogs = [];

  // The site appears to use relative links from category pages
  // Links look like: href="../general/2025/12/30/balance_of_power.html"
  const linkRegex = /href="(?:\.\.\/)?([a-z]+\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.html)"[^>]*>([^<]+)</gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const path = match[1];
    const title = match[2].trim();

    // Skip empty titles or navigation elements
    if (!title || title.length < 3) continue;

    // Extract date from path
    const pathParts = path.match(/([a-z]+)\/(\d{4})\/(\d{2})\/(\d{2})\/(.+)\.html/i);
    if (!pathParts) continue;

    const [, category, year, month, day, slug] = pathParts;

    blogs.push({
      id: `${category}-${year}-${month}-${day}-${slug}`,
      title,
      date: `${year}-${month}-${day}`,
      category,
      url: `${BASE_URL}/${path}`,
      path
    });
  }

  // Remove duplicates based on id
  const seen = new Set();
  return blogs.filter(blog => {
    if (seen.has(blog.id)) return false;
    seen.add(blog.id);
    return true;
  });
}

function extractContent(html) {
  // Remove script and style tags
  let content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  // Try to find main content area
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                    content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                    content.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  if (mainMatch) {
    content = mainMatch[1];
  }

  // Convert to plain text while preserving some structure
  content = content
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n## $1\n\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content;
}

async function main() {
  console.log('Fetching Vitalik blog index...');

  // Try to load existing blogs.json to preserve already-generated summaries
  const outputPath = resolve(__dirname, '../public/blogs.json');
  let existingBlogs = {};
  if (existsSync(outputPath)) {
    try {
      const existing = JSON.parse(readFileSync(outputPath, 'utf-8'));
      existing.forEach(b => { existingBlogs[b.id] = b; });
      console.log(`Loaded ${Object.keys(existingBlogs).length} existing blogs from cache`);
    } catch (e) {
      console.log('Could not load existing blogs.json, starting fresh');
    }
  }

  try {
    // Fetch all category pages to get complete blog list
    let allBlogs = [];

    for (const category of CATEGORY_PAGES) {
      console.log(`Fetching ${category} category...`);
      try {
        const categoryUrl = `${BASE_URL}/categories/${category}.html`;
        const categoryPage = await fetchWithRetry(categoryUrl);
        const categoryBlogs = parseHomepage(categoryPage);
        console.log(`  Found ${categoryBlogs.length} posts in ${category}`);
        allBlogs = allBlogs.concat(categoryBlogs);
      } catch (err) {
        console.log(`  Failed to fetch ${category}: ${err.message}`);
      }
    }

    // Remove duplicates
    const seen = new Set();
    const blogs = allBlogs.filter(blog => {
      if (seen.has(blog.id)) return false;
      seen.add(blog.id);
      return true;
    });

    console.log(`Found ${blogs.length} blog posts`);

    // Fetch content for each blog (limit to avoid rate limiting)
    const blogsWithContent = [];
    const batchSize = 5;

    for (let i = 0; i < blogs.length; i += batchSize) {
      const batch = blogs.slice(i, i + batchSize);
      console.log(`Fetching blogs ${i + 1}-${Math.min(i + batchSize, blogs.length)}...`);

      const results = await Promise.all(
        batch.map(async (blog) => {
          // Preserve existing data if available
          const existing = existingBlogs[blog.id];

          try {
            const html = await fetchWithRetry(blog.url);
            const content = extractContent(html);
            return {
              ...blog,
              content,
              contentLength: content.length,
              // Preserve existing summaries
              summary: existing?.summary || null,
              detailedSummary: existing?.detailedSummary || null
            };
          } catch (error) {
            console.log(`  Failed to fetch ${blog.title}: ${error.message}`);
            return {
              ...blog,
              content: existing?.content || '',
              contentLength: existing?.contentLength || 0,
              error: error.message,
              summary: existing?.summary || null,
              detailedSummary: existing?.detailedSummary || null
            };
          }
        })
      );

      blogsWithContent.push(...results);

      // Small delay between batches
      if (i + batchSize < blogs.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Sort by date (newest first)
    blogsWithContent.sort((a, b) => b.date.localeCompare(a.date));

    // Generate summaries (one at a time to avoid rate limits)
    if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your_api_key_here') {
      console.log('\nGenerating AI summaries...');

      for (let i = 0; i < blogsWithContent.length; i++) {
        const blog = blogsWithContent[i];

        if (!blog.content) continue;

        // Generate one-sentence summary if missing
        if (!blog.summary) {
          process.stdout.write(`\r[${i + 1}/${blogsWithContent.length}] One-sentence: ${blog.title.slice(0, 35)}...`);
          blog.summary = await generateOneSentenceSummary(blog.content, blog.title);
          await new Promise(r => setTimeout(r, 2000));
        }

        // Generate detailed summary if missing
        if (!blog.detailedSummary) {
          process.stdout.write(`\r[${i + 1}/${blogsWithContent.length}] Detailed: ${blog.title.slice(0, 35)}...    `);
          blog.detailedSummary = await generateDetailedSummary(blog.content, blog.title);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      console.log('\n');
      const summaryCount = blogsWithContent.filter(b => b.summary).length;
      const detailedCount = blogsWithContent.filter(b => b.detailedSummary).length;
      console.log(`One-sentence summaries: ${summaryCount}/${blogsWithContent.length}`);
      console.log(`Detailed summaries: ${detailedCount}/${blogsWithContent.length}`);
    } else {
      console.log('\nSkipping summary generation (no API key configured)');
    }

    // Save to public folder
    writeFileSync(outputPath, JSON.stringify(blogsWithContent, null, 2));

    console.log(`\nSaved ${blogsWithContent.length} blogs to public/blogs.json`);

    // Stats
    const successCount = blogsWithContent.filter(b => b.content).length;
    const totalChars = blogsWithContent.reduce((sum, b) => sum + b.contentLength, 0);
    console.log(`Successfully fetched: ${successCount}/${blogsWithContent.length}`);
    console.log(`Total content: ${(totalChars / 1000).toFixed(0)}k characters`);

  } catch (error) {
    console.error('Failed to fetch blogs:', error);
    process.exit(1);
  }
}

main();
