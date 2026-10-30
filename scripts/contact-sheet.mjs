import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const data = JSON.parse(await readFile(path.join('curation', 'index.json'), 'utf8'));
await mkdir('curation', { recursive: true });

const colors = {
  ceramica: '#b4643c',
  restauro: '#476a6a',
  pintura: '#8b5e83',
  personalizado: '#a9552f',
  objeto: '#7a6a55',
};

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function overlay(item, index, width, height) {
  const label = (item.caption || 'Sem título').replace(/\s+/g, ' ').slice(0, 54);
  const stat = item.platform === 'instagram' ? `${item.likes} gostos` : `${item.views ?? 0} views · ${item.likes} gostos`;
  const color = colors[item.category] ?? '#7a6a55';
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="none"/>
    <rect x="10" y="10" width="42" height="42" rx="21" fill="#22201d" opacity="0.88"/>
    <text x="31" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="#f4efe7">${index + 1}</text>
    <rect x="10" y="${height - 92}" width="${width - 20}" height="82" rx="6" fill="#f4efe7" opacity="0.94"/>
    <rect x="10" y="${height - 92}" width="6" height="82" rx="3" fill="${color}"/>
    <text x="26" y="${height - 66}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#22201d">${esc(label)}</text>
    <text x="26" y="${height - 44}" font-family="Arial, sans-serif" font-size="11" fill="#5a534a">${esc(item.category.toUpperCase())} · ${esc(item.platform)}</text>
    <text x="26" y="${height - 24}" font-family="Arial, sans-serif" font-size="11" fill="#5a534a">${esc(stat)}</text>
  </svg>`);
}

async function sheet(items, file, columns, cellWidth, cellHeight) {
  const rows = Math.ceil(items.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    let image;
    try {
      image = await sharp(item.cover)
        .resize(cellWidth - 24, cellHeight - 104, { fit: 'contain', background: '#e9e0d2' })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      image = await sharp({ create: { width: cellWidth - 24, height: cellHeight - 104, channels: 3, background: '#d9c9b4' } }).jpeg().toBuffer();
    }
    composites.push({ input: image, left: left + 12, top: top + 12 });
    composites.push({ input: overlay(item, index, cellWidth, cellHeight), left, top });
  }
  await sharp({ create: { width, height, channels: 3, background: '#f4efe7' } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(file);
  console.log(file, width, height, items.length);
}

const instagram = data.items.filter((item) => item.platform === 'instagram');
const tiktok = data.items.filter((item) => item.platform === 'tiktok').slice(0, 24);
await sheet(instagram, path.join('curation', 'sheet-instagram.jpg'), 3, 360, 480);
await sheet(tiktok, path.join('curation', 'sheet-tiktok.jpg'), 4, 300, 400);

await sharp(path.join('curation', 'sheet-instagram.jpg')).resize({ width: 1080 }).jpeg({ quality: 85 }).toFile(path.join('curation', 'sheet-instagram-small.jpg'));
await sharp(path.join('curation', 'sheet-tiktok.jpg')).resize({ width: 1200 }).jpeg({ quality: 85 }).toFile(path.join('curation', 'sheet-tiktok-small.jpg'));
