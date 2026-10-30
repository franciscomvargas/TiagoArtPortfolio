import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const pieces = {
  coral: ['curation/raw/instagram/DKagtgrI9Vk/cover.jpg'],
  galhos: ['curation/frames/7452687973579083030-90.jpg', 'curation/frames/7452687973579083030-60.jpg'],
  terrina: ['curation/raw/instagram/DKcisT8IXKM/cover.jpg'],
  fruteira: ['curation/raw/instagram/DKc08CrojSV/cover.jpg'],
  mascara: ['curation/raw/instagram/DINHtf7IjK3/cover.jpg', 'curation/frames/7491094806005828886-90.jpg'],
  aranha: ['curation/raw/instagram/DINKuoUI7H-/cover.jpg'],
  lobo: ['curation/raw/instagram/DINHR9aIcao/cover.jpg'],
  tentaculo: ['curation/raw/instagram/DJKV1jEsT2u/cover.jpg'],
  atividade: ['curation/raw/instagram/DKX-N4pIlqg/cover.jpg'],
  alien: ['curation/raw/tiktok/7467335754302131478.image'],
  pizza: ['curation/frames/7455862546449337622-30.jpg', 'curation/frames/7455862546449337622-60.jpg'],
  luxo: ['curation/frames/7425026867322817825-90.jpg', 'curation/frames/7425026867322817825-60.jpg'],
  caveira: ['curation/raw/instagram/DININXeoO2c/cover.jpg'],
  tempo: ['curation/frames/7407902340532964640-1.jpg'],
  floresta: ['curation/raw/links/instagram/Coit6mLND3S/01.webp', 'curation/raw/links/instagram/Coit6mLND3S/02.webp'],
  canion: ['curation/raw/links/instagram/CoiuW8nt27x/01.webp'],
  crepusculo: ['curation/raw/links/instagram/Coiuh1nt0VV/01.webp'],
  surfista: ['curation/raw/links/instagram/C4OYV7hNg0o/01.webp'],
  burros: ['curation/raw/links/instagram/C3oGG_Ut4vz/01.webp'],
};

const process = [
  ['curation/raw/tiktok/frames/7456974655866408214.jpg', 'processo/01.jpg'],
  ['curation/raw/tiktok/frames/7461399613346417942.jpg', 'processo/02.jpg'],
  ['curation/raw/tiktok/frames/7455039904947473687.jpg', 'processo/03.jpg'],
  ['curation/raw/tiktok/frames/7446582958670056726.jpg', 'atelier.jpg'],
];

for (const [slug, files] of Object.entries(pieces)) {
  const dir = path.join('src', 'assets', 'obras', slug);
  await mkdir(dir, { recursive: true });
  for (let index = 0; index < files.length; index += 1) {
    const output = path.join(dir, `${String(index + 1).padStart(2, '0')}.jpg`);
    await sharp(files[index])
      .rotate()
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toFile(output);
    console.log(output);
  }
}

for (const [source, target] of process) {
  const output = path.join('src', 'assets', target);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(source).rotate().jpeg({ quality: 90 }).toFile(output);
  console.log(output);
}
