import type { ImageMetadata } from 'astro';

const modules = import.meta.glob('/src/assets/**/*.jpg', { eager: true }) as Record<
  string,
  { default: ImageMetadata }
>;

export function image(path: string): ImageMetadata {
  const asset = modules[`/src/assets/${path}`] ?? modules[`/src/assets/obras/${path}`];
  if (!asset) throw new Error(`Missing asset: ${path}`);
  return asset.default;
}
