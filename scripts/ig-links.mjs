import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const OUT = path.join('curation', 'raw', 'links', 'instagram');
const links = JSON.parse(await readFile(path.join('curation', 'links.json'), 'utf8')).filter((item) => item.url.includes('instagram.com'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shortcode(url) {
  return url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
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

async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': UA,
      'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseScripts(html) {
  const out = [];
  for (const match of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      out.push(JSON.parse(match[1]));
    } catch {
    }
  }
  return out;
}

function bestImage(node) {
  return node?.image_versions2?.candidates?.[0]?.url ?? node?.display_uri ?? null;
}

function bestVideo(node) {
  return [...(node?.video_versions ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

async function download(url, file) {
  if (!url) return null;
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' } });
  if (!res.ok) return null;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const results = [];
  for (const link of links) {
    const code = shortcode(link.url);
    if (!code) continue;
    const url = `https://www.instagram.com/p/${code}/`;
    console.log('fetch', code);
    const html = await getHtml(url);
    const scripts = parseScripts(html);
    let media = null;
    for (const script of scripts) {
      walk(script, (node) => {
        if (!media && node?.code === code && node?.like_count !== undefined) media = node;
      });
      if (media) break;
    }
    if (!media) throw new Error(`No media JSON for ${code}`);

    const dir = path.join(OUT, code);
    const files = [];
    const items = media.carousel_media?.length ? media.carousel_media : [media];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const imageUrl = bestImage(item);
      const imageFile = imageUrl ? await download(imageUrl, path.join(dir, `${String(index + 1).padStart(2, '0')}.webp`)) : null;
      if (imageFile) files.push(imageFile);
      if (!media.carousel_media && media.video_versions) {
        const videoUrl = bestVideo(media);
        if (videoUrl) await download(videoUrl, path.join(dir, 'video.mp4'));
      }
    }

    results.push({
      category: link.category,
      shortcode: code,
      url,
      date: media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null,
      caption: media.caption?.text ?? '',
      likes: media.like_count ?? null,
      comments: media.comment_count ?? null,
      mediaType: media.media_type,
      width: media.original_width ?? null,
      height: media.original_height ?? null,
      files,
      video: media.video_versions ? path.join(dir, 'video.mp4') : null,
    });
    console.log(' saved', files.length, media.like_count, media.caption?.text?.slice(0, 50).replace(/\n/g, ' '));
    await sleep(8000);
  }
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(results, null, 2));
  console.log('done', results.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
