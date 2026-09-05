import type { NuxtApp } from '#app';

type AsyncDataCacheContext = {
  cause?: string;
};

/**
 * Prefer prerender/hydration payload over a live refetch.
 * In `nuxt dev`, manual/`refresh()` still refetches so CMS edits show up.
 * In production client, always reuse payload/static (wpFetch is also gated).
 */
export function preferStaticCachedData<T>(
  key: string,
  nuxtApp: NuxtApp,
  ctx?: AsyncDataCacheContext,
): T | undefined {
  const isRefresh =
    ctx?.cause === 'refresh:manual' || ctx?.cause === 'refresh:hook';
  if (isRefresh && import.meta.dev) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(nuxtApp.payload.data, key)) {
    return nuxtApp.payload.data[key] as T;
  }
  if (Object.prototype.hasOwnProperty.call(nuxtApp.static.data, key)) {
    return nuxtApp.static.data[key] as T;
  }
  return undefined;
}
