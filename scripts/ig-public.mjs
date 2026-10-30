import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const USER = 'tiagocost_art';
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BASE = `https://www.instagram.com/${USER}/`;
const OUT = path.join('curation', 'raw', 'instagram');
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shortcodeFromPk(pk) {
  let n = BigInt(pk);
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n % 64n)] + out;
    n /= 64n;
  }
  return out;
}

async function getHtml(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        'user-agent': UA,
        'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (res.ok) return await res.text();
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await sleep(15000 * attempt);
  }
}

function parseJsonScripts(html) {
  const scripts = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)];
  const out = [];
  for (const script of scripts) {
    try {
      out.push(JSON.parse(script[1]));
    } catch {
    }
  }
  return out;
}

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  visit(value);
  for (const item of Object.values(value)) walk(item, visit);
}

function bestImage(node) {
  const candidates = node?.image_versions2?.candidates ?? [];
  return [...candidates].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? node?.display_uri ?? null;
}

function bestVideo(node) {
  const versions = node?.video_versions ?? [];
  return [...versions].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

async function download(url, file) {
  if (!url) return null;
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' } });
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const html = await getHtml(BASE);
  const scripts = parseJsonScripts(html);
  const profileBlob = scripts.find((script) => JSON.stringify(script).includes('polaris_timeline_connection'));
  if (!profileBlob) throw new Error('Profile timeline not found');

  const meta = { platform: 'instagram', username: USER, scrapedAt: new Date().toISOString() };
  const description = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/)?.[1];
  if (description) {
    const followers = description.match(/([\d,.]+)\s+Followers/i)?.[1];
    const posts = description.match(/([\d,.]+)\s+Posts/i)?.[1];
    const following = description.match(/([\d,.]+)\s+Following/i)?.[1];
    meta.followers = followers ? Number(followers.replace(/[,.]/g, '')) : null;
    meta.posts = posts ? Number(posts.replace(/[,.]/g, '')) : null;
    meta.following = following ? Number(following.replace(/[,.]/g, '')) : null;
  }

  const posts = [];
  walk(profileBlob, (node) => {
    if (node?.pk && (node.image_versions2 || node.video_versions)) {
      posts.push(node);
    }
  });

  const unique = [...new Map(posts.map((post) => [post.pk, post])).values()];
  const items = [];

  for (const post of unique) {
    const shortcode = shortcodeFromPk(post.pk);
    const url = `https://www.instagram.com/reel/${shortcode}/`;
    const postHtml = await getHtml(url);
    const postScripts = parseJsonScripts(postHtml);
    let detail = null;
    for (const script of postScripts) {
      walk(script, (node) => {
        if (!detail && node?.code === shortcode && node?.like_count !== undefined) detail = node;
      });
      if (detail) break;
    }

    const source = detail ?? post;
    const coverUrl = bestImage(source) ?? bestImage(post);
    const videoUrl = bestVideo(source);
    const coverFile = await download(coverUrl, path.join(OUT, shortcode, 'cover.jpg'));
    const videoFile = videoUrl ? await download(videoUrl, path.join(OUT, shortcode, 'video.mp4')) : null;

    items.push({
      platform: 'instagram',
      id: post.pk,
      shortcode,
      url,
      date: source.taken_at ? new Date(source.taken_at * 1000).toISOString() : null,
      caption: source.caption?.text ?? post.caption?.text ?? '',
      likes: source.like_count ?? null,
      comments: source.comment_count ?? null,
      views: source.play_count ?? source.view_count ?? null,
      mediaType: source.media_type ?? post.media_type ?? null,
      videoUrl,
      coverUrl,
      localCover: coverFile,
      localVideo: videoFile,
    });
    console.log(shortcode, items.at(-1).likes, items.at(-1).date?.slice(0, 10), items.at(-1).caption.slice(0, 60).replace(/\n/g, ' '));
    await sleep(12000);
  }

  await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ meta, items }, null, 2));
  console.log(`Saved ${items.length} posts to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
