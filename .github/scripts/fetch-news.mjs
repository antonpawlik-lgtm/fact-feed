// Fetches the configured RSS feeds (text news + YouTube channels) and writes
// news.json for the static site. Runs in GitHub Actions (see
// .github/workflows/update-news.yml) — never in the browser, so feed CORS
// and news-API browser restrictions don't apply.
import Parser from 'rss-parser';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '..', '..', 'news.json');

const MAX_ITEMS_PER_FEED = 8;

const NEWS_SOURCES = [
  { lang: 'de', topic: 'general', source: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/' },
  { lang: 'de', topic: 'tech', source: 'heise online', url: 'https://www.heise.de/rss/heise-top-atom.xml' },
  { lang: 'de', topic: 'tech', source: 'Golem.de', url: 'https://rss.golem.de/rss.php?feed=RSS2.0' },
  { lang: 'en', topic: 'general', source: 'BBC News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  { lang: 'en', topic: 'tech', source: 'BBC News', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml' },
  { lang: 'en', topic: 'tech', source: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  // AI-focused (added on user request for more/better AI coverage)
  { lang: 'en', topic: 'ai', source: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { lang: 'en', topic: 'ai', source: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { lang: 'en', topic: 'ai', source: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/' },
  { lang: 'en', topic: 'ai', source: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { lang: 'en', topic: 'ai', source: 'Wired', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { lang: 'en', topic: 'ai', source: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
];

// YouTube's public per-channel Atom feed needs no API key/quota. Only a
// handful of items per channel per run (these move slower than text news).
const MAX_ITEMS_PER_CHANNEL = 4;
const YOUTUBE_CHANNELS = [
  { lang: 'en', channelId: 'UCbfYPyITQ-7l4upoX8nvctg', source: 'Two Minute Papers' }, // AI research, short-form
  { lang: 'en', channelId: 'UCSHZKyawb77ixDdsGog4iWA', source: 'Lex Fridman' }, // AI interviews/podcast
  { lang: 'en', channelId: 'UCsBjURrPoezykLs9EqgamOA', source: 'Fireship' }, // tech/dev, fast-paced
  { lang: 'en', channelId: 'UCBJycsmduvYEL83R_U4JriQ', source: 'Marques Brownlee' }, // general tech/gadgets
];

const parser = new Parser({ timeout: 15000 });

function stripHtml(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function itemId(link) {
  return 'n_' + createHash('sha1').update(link).digest('hex').slice(0, 10);
}

function extractVideoId(link) {
  try {
    return new URL(link).searchParams.get('v');
  } catch {
    return null;
  }
}

const items = [];
const seenUrls = new Set();
let failedFeeds = 0;

for (const feed of NEWS_SOURCES) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const fresh = (parsed.items || [])
      .filter((it) => it.link && it.title)
      .sort((a, b) => new Date(b.isoDate || b.pubDate || 0) - new Date(a.isoDate || a.pubDate || 0))
      .slice(0, MAX_ITEMS_PER_FEED);

    for (const it of fresh) {
      if (seenUrls.has(it.link)) continue; // dedupe across feeds
      seenUrls.add(it.link);
      items.push({
        id: itemId(it.link),
        type: 'news',
        topic: feed.topic,
        lang: feed.lang,
        headline: stripHtml(it.title),
        summary: stripHtml(it.contentSnippet || it.content || '').slice(0, 280),
        source: feed.source,
        url: it.link,
        publishedAt: new Date(it.isoDate || it.pubDate || Date.now()).toISOString(),
      });
    }
    console.log(`ok   ${feed.source} (${feed.lang}/${feed.topic}): ${fresh.length} items`);
  } catch (e) {
    failedFeeds += 1;
    console.error(`FAIL ${feed.source}: ${e.message}`);
  }
}

for (const ch of YOUTUBE_CHANNELS) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
  try {
    const parsed = await parser.parseURL(feedUrl);
    const fresh = (parsed.items || [])
      .filter((it) => it.link && it.title)
      .sort((a, b) => new Date(b.isoDate || b.pubDate || 0) - new Date(a.isoDate || a.pubDate || 0))
      .slice(0, MAX_ITEMS_PER_CHANNEL);

    for (const it of fresh) {
      if (seenUrls.has(it.link)) continue;
      const videoId = extractVideoId(it.link);
      if (!videoId) continue; // can't build a thumbnail without it — skip rather than guess
      seenUrls.add(it.link);
      items.push({
        id: itemId(it.link),
        type: 'video',
        topic: 'video',
        lang: ch.lang,
        headline: stripHtml(it.title),
        summary: '',
        source: ch.source,
        url: it.link,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: new Date(it.isoDate || it.pubDate || Date.now()).toISOString(),
      });
    }
    console.log(`ok   ${ch.source} (YouTube): ${fresh.length} items`);
  } catch (e) {
    failedFeeds += 1;
    console.error(`FAIL ${ch.source} (YouTube): ${e.message}`);
  }
}

if (items.length === 0) {
  // Never write an empty file over a working one — keep whatever is deployed.
  console.error('No items fetched at all; keeping the existing news.json.');
  process.exit(1);
}

const out = { generatedAt: new Date().toISOString(), items };
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`\nWrote ${items.length} items (${failedFeeds} feed(s) failed) to news.json`);
