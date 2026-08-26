import type { WpMedia } from '~/types/wp';
import { wpFetch } from './client';

export async function getMedia(id: number): Promise<WpMedia | null> {
  if (!id || id <= 0) return null;
  try {
    return await wpFetch<WpMedia>(`/wp/v2/media/${id}`);
  } catch {
    return null;
  }
}
