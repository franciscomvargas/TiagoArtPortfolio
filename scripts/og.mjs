import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const pieces = JSON.parse(await readFile('src/data/pieces.json', 'utf8'));
const labels = {
  ceramica: 'Cerâmica',
  restauro: 'Restauro',
  personalizado: 'Personalizado',
  pintura: 'Pintura',
  ilustracao: 'Ilustração',
};

const W = 1200;
const H = 630;

function escapeXml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function make(piece, file, defaultTitle = null) {
  const title = defaultTitle ?? piece.title;
  const category = piece ? labels[piece.category] : 'Cerâmica · Restauro · Arte';
  const cover = piece ? path.join('src/assets/obras', piece.cover) : 'src/assets/obras/coral/01.jpg';
  const image = await sharp(cover)
    .resize(390, 540, { fit: 'contain', background: '#ece4d7' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const titleSize = title.length > 22 ? 46 : title.length > 16 ? 54 : 72;
  const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="54" y="42" width="408" height="558" fill="none" stroke="#22201d" stroke-width="1.5"/>
    <text x="518" y="94" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="4" fill="#914728">${escapeXml(category.toUpperCase())}</text>
    <line x1="518" y1="116" x2="1136" y2="116" stroke="#22201d" stroke-width="1" opacity="0.22"/>
    <text x="512" y="${titleSize > 60 ? 260 : 250}" font-family="Georgia, serif" font-size="${titleSize}" letter-spacing="-2" fill="#22201d">${escapeXml(title)}</text>
    <text x="518" y="${titleSize > 60 ? 318 : 306}" font-family="Georgia, serif" font-size="24" font-style="italic" fill="#b4643c">peça única, feita à mão</text>
    <line x1="518" y1="500" x2="1136" y2="500" stroke="#22201d" stroke-width="1" opacity="0.22"/>
    <text x="518" y="544" font-family="Georgia, serif" font-size="25" fill="#22201d">Tiago Costa</text>
    <text x="518" y="574" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="2.5" fill="#6f665a">CERÂMICA · RESTAURO · OLIVEIRA DE AZEMÉIS</text>
    <text x="1136" y="574" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" letter-spacing="2.5" fill="#6f665a">@TIAGOCOST_ART</text>
  </svg>`);

  await sharp({ create: { width: W, height: H, channels: 3, background: '#f4efe7' } })
    .composite([
      { input: image, left: 64, top: 52 },
      { input: overlay, left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toFile(file);
}

await mkdir('public/og', { recursive: true });
for (const piece of pieces) {
  await make(piece, path.join('public', 'og', `${piece.slug}.jpg`));
  console.log(piece.slug);
}
await make(null, 'public/og-default.jpg', 'Cerâmica & restauro');
console.log('default');
