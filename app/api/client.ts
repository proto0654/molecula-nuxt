import type { FetchOptions } from 'ofetch';
import { $fetch } from 'ofetch';

export type WpPaginationMeta = {
  total: number;
  totalPages: number;
};

export type WpPaginatedResult<T> = {
  data: T;
  pagination: WpPaginationMeta;
};

/** Build-time / Node-safe base (nuxt.config hooks, generate). */
export function getWpApiBaseFromEnv(): string {
  const base =
    process.env.NUXT_PUBLIC_WP_API_BASE ||
    process.env.NUXT_PUBLIC_WP_API_BASE_URL ||
    'https://api.weblaba.ru/wp-json';
  return base.replace(/\/$/, '');
}

function resolveWpApiBase(override?: string): string {
  if (typeof override === 'string' && override) return override.replace(/\/$/, '');
  // `wpFetch` often runs inside `useAsyncData` after `await` — Nuxt context
  // is gone there. `tryUseNuxtApp` avoids NUXT_E1001; env covers build/prerender.
  const nuxtApp = tryUseNuxtApp();
  const fromConfig = nuxtApp?.$config?.public?.wpApiBase as string | undefined;
  const base = fromConfig || getWpApiBaseFromEnv();
  return base.replace(/\/$/, '');
}

function joinUrl(base: string, path: string): string {
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseHeaderInt(headers: Headers, name: string, fallback: number): number {
  const raw = headers.get(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Typed WordPress REST fetch. Components must not call WP URLs directly.
 */
export async function wpFetch<T>(
  path: string,
  options: FetchOptions<'json'> = {},
  baseOverride?: string,
): Promise<T> {
  const url = joinUrl(resolveWpApiBase(baseOverride), path);
  return $fetch<T>(url, options);
}

/**
 * Same as wpFetch, but also returns X-WP-Total / X-WP-TotalPages when present.
 */
export async function wpFetchPaginated<T>(
  path: string,
  options: FetchOptions<'json'> = {},
  baseOverride?: string,
): Promise<WpPaginatedResult<T>> {
  const url = joinUrl(resolveWpApiBase(baseOverride), path);
  const response = await $fetch.raw<T>(url, options);
  const data = response._data as T;
  const headers = response.headers;
  const total = parseHeaderInt(headers, 'x-wp-total', Array.isArray(data) ? data.length : 0);
  const totalPages = parseHeaderInt(headers, 'x-wp-totalpages', 1);
  return {
    data,
    pagination: { total, totalPages },
  };
}
