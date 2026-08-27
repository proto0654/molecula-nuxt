import type { ThemeOptionsAcf, WpAcfOptionsResponse } from '~/types/wp';
import { wpFetch } from './client';

/** Public ACF options (theme chrome). EN keys present; callers pick RU. */
export async function getThemeOptions(): Promise<ThemeOptionsAcf> {
  const data = await wpFetch<WpAcfOptionsResponse>('/acf/v3/options/options');
  return data.acf ?? {};
}
