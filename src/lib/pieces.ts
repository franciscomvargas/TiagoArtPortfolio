import piecesData from '../data/pieces.json';
import { image } from './images';

export type PieceCategory = 'ceramica' | 'restauro' | 'personalizado' | 'pintura';

export const pieces = piecesData.map((piece) => ({
  ...piece,
  category: piece.category as PieceCategory,
  coverImage: image(piece.cover),
  gallery: piece.images.map((path) => image(path)),
}));

export type Piece = (typeof pieces)[number];

export function getPiece(slug: string): Piece {
  const piece = pieces.find((item) => item.slug === slug);
  if (!piece) throw new Error(`Unknown piece: ${slug}`);
  return piece;
}
