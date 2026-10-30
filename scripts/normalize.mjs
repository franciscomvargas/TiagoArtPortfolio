import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RAW = path.join('curation', 'raw');
const OUT = path.join('curation', 'index.json');

function category(text = '') {
  const t = text.toLowerCase();
  if (/(restaur|antiguidade|recuper)/.test(t)) return 'restauro';
  if (/(cerâmic|ceramic|vaso|fruteira|prato|jarra|barro|grés|gres)/.test(t)) return 'ceramica';
  if (/(tela|acrílico|acrilico|\bpintura\b)/.test(t)) return 'pintura';
  if (/(personaliz|custom|homem aranha|spider|graffiti|cinzeiro|base para lata)/.test(t)) return 'personalizado';
  return 'objeto';
}

function zscores(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance) || 1;
  return values.map((value) => (value - mean) / sd);
}

async function main() {
  const ig = JSON.parse(await readFile(path.join(RAW, 'instagram', 'index.json'), 'utf8'));
  const tiktokFiles = (await readdir(path.join(RAW, 'tiktok'))).filter((file) => file.endsWith('.info.json'));
  const tiktok = [];
  for (const file of tiktokFiles) {
    const data = JSON.parse(await readFile(path.join(RAW, 'tiktok', file), 'utf8'));
    if (!data.id || !data.webpage_url?.includes('/video/')) continue;
    tiktok.push(data);
  }

  const followers = ig.meta.followers || 1;
  const igItems = ig.items.map((item) => {
    const likes = item.likes ?? 0;
    const comments = item.comments ?? 0;
    return {
      platform: 'instagram',
      id: item.id,
      url: item.url,
      date: item.date,
      caption: item.caption ?? '',
      likes,
      comments,
      views: item.views ?? null,
      shares: null,
      category: category(item.caption),
      videoUrl: item.videoUrl,
      coverUrl: item.coverUrl,
      cover: item.localCover,
      video: item.localVideo,
      er: (likes + 3 * comments) / followers,
    };
  });

  const tiktokItems = tiktok.map((item) => {
    const likes = item.like_count ?? 0;
    const comments = item.comment_count ?? 0;
    const shares = item.repost_count ?? 0;
    const views = item.view_count ?? 0;
    return {
      platform: 'tiktok',
      id: item.id,
      url: item.webpage_url,
      date: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null,
      caption: item.description ?? '',
      likes,
      comments,
      views,
      shares,
      category: category(item.description),
      videoUrl: item.webpage_url,
      coverUrl: item.thumbnail,
      cover: existsSync(path.join(RAW, 'tiktok', 'frames', `${item.id}.jpg`)) ? path.join(RAW, 'tiktok', 'frames', `${item.id}.jpg`) : path.join(RAW, 'tiktok', `${item.id}.image`),
      video: path.join(RAW, 'tiktok', 'video', `${item.id}.mp4`),
      er: (likes + 3 * comments + 2 * shares) / Math.max(views, 1),
    };
  });

  const igEr = zscores(igItems.map((item) => item.er));
  const ttEr = zscores(tiktokItems.map((item) => item.er));
  const ttViews = zscores(tiktokItems.map((item) => Math.log10((item.views ?? 0) + 1)));
  igItems.forEach((item, index) => {
    item.score = igEr[index];
  });
  tiktokItems.forEach((item, index) => {
    item.score = 0.7 * ttEr[index] + 0.3 * ttViews[index];
  });

  const all = [...igItems, ...tiktokItems].sort((a, b) => b.score - a.score);
  await writeFile(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    profile: {
      instagram: ig.meta,
      tiktok: { followers: 1271, videos: 53 },
    },
    items: all,
  }, null, 2));

  const header = 'platform,id,category,date,likes,comments,views,score,caption,url,cover\n';
  const rows = all.map((item) => [
    item.platform,
    item.id,
    item.category,
    item.date?.slice(0, 10) ?? '',
    item.likes,
    item.comments,
    item.views ?? '',
    item.score.toFixed(3),
    `"${(item.caption ?? '').replace(/\s+/g, ' ').replace(/"/g, '""').slice(0, 100)}"`,
    item.url,
    item.cover,
  ].join(',')).join('\n');
  await writeFile(path.join('curation', 'shortlist.csv'), header + rows);

  console.log(`Indexed ${igItems.length} Instagram + ${tiktokItems.length} TikTok items`);
  console.log('Categories:', Object.fromEntries(['ceramica', 'restauro', 'pintura', 'personalizado', 'objeto'].map((name) => [name, all.filter((item) => item.category === name).length])));
  console.log('Top 10:');
  for (const item of all.slice(0, 10)) {
    console.log(item.platform, item.category, item.score.toFixed(2), item.likes, item.views, (item.caption ?? '').slice(0, 60).replace(/\n/g, ' '));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
