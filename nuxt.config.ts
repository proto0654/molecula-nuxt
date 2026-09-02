import { $fetch } from 'ofetch';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import {
  buildRobotsTxt,
  buildSitemapXml,
  isIndexable,
  setPrerenderRoutes,
} from './lib/seo-static';

function wpApiBase(): string {
  return (
    process.env.NUXT_PUBLIC_WP_API_BASE ||
    'https://api.weblaba.ru/wp-json'
  ).replace(/\/$/, '');
}

function appBaseURL(): string {
  const base = process.env.NUXT_APP_BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function publicAsset(path: string): string {
  return `${appBaseURL()}${path.replace(/^\//, '')}`;
}

const indexable = isIndexable();

type SlimPost = { slug: string };

async function fetchAllCptSlugs(cpt: string): Promise<string[]> {
  const base = wpApiBase();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const slugs: string[] = [];

  while (page <= totalPages) {
    const response = await $fetch.raw<SlimPost[]>(`${base}/wp/v2/${cpt}`, {
      query: {
        page,
        per_page: perPage,
        status: 'publish',
        _fields: 'slug',
      },
    });
    const batch = response._data ?? [];
    for (const post of batch) {
      if (post.slug) slugs.push(post.slug);
    }
    const header = response.headers.get('x-wp-totalpages');
    totalPages = header ? Math.max(1, Number.parseInt(header, 10) || 1) : 1;
    page += 1;
  }

  return slugs;
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  /** Dev has no `_payload.json`; disabling extraction avoids 404 on archive → detail nav. */
  experimental: {
    payloadExtraction: process.env.NODE_ENV === 'production',
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    // Set via NUXT_APP_BASE_URL for GitHub Pages (e.g. /molecula-nuxt/). Do not hardcode.
    baseURL: appBaseURL(),
    head: {
      title: 'WebLaba',
      titleTemplate: '%s',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...(indexable
          ? []
          : [{ name: 'robots', content: 'noindex, nofollow' }]),
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: publicAsset('sign-weblaba.svg'),
        },
        {
          rel: 'icon',
          type: 'image/png',
          href: publicAsset('sign-weblaba.png'),
        },
        {
          rel: 'apple-touch-icon',
          href: publicAsset('sign-weblaba.png'),
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      /** WordPress REST base. Override with NUXT_PUBLIC_WP_API_BASE. */
      wpApiBase: 'https://api.weblaba.ru/wp-json',
      /** Public site origin for canonical/OG/sitemap. Override with NUXT_PUBLIC_SITE_URL. */
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://weblaba.ru',
      /** false on preview builds — robots.txt Disallow + meta noindex. */
      indexable,
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/portfolio', '/about', '/services', '/contact'],
    },
  },
  hooks: {
    async 'nitro:config'(nitroConfig) {
      if (nitroConfig.dev) return;
      nitroConfig.prerender ??= {};
      nitroConfig.prerender.routes ??= [];
      const existing = nitroConfig.prerender.routes as string[];

      const pushRoutes = (routes: string[]) => {
        for (const route of routes) {
          if (!existing.includes(route)) existing.push(route);
        }
      };

      pushRoutes(['/', '/portfolio', '/about', '/services', '/contact']);

      try {
        const slugs = await fetchAllCptSlugs('portfolio');
        const routes = slugs.map((slug) => `/portfolio/${slug}`);
        pushRoutes(routes);
        console.info(`[prerender] queued ${routes.length} portfolio case routes`);
      } catch (err) {
        console.warn('[prerender] failed to fetch portfolio slugs:', err);
      }

      try {
        const slugs = await fetchAllCptSlugs('services');
        const routes = slugs.map((slug) => `/services/${slug}`);
        pushRoutes(routes);
        console.info(`[prerender] queued ${routes.length} service routes`);
      } catch (err) {
        console.warn('[prerender] failed to fetch service slugs:', err);
      }

      setPrerenderRoutes(existing);
    },
    'nitro:build:public-assets'(nitro) {
      const publicDir = nitro.options.output.publicDir;
      writeFileSync(join(publicDir, 'robots.txt'), buildRobotsTxt());
      writeFileSync(join(publicDir, 'sitemap.xml'), buildSitemapXml());
      console.info('[seo] wrote robots.txt and sitemap.xml');
    },
  },
});
