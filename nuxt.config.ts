import { $fetch } from 'ofetch';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { collectCptSlugs, WP_MAX_PER_PAGE } from './app/api/collections';
import { verifyStaticOutput } from './lib/verify-static.mjs';
import {
  buildRobotsTxt,
  buildSitemapXml,
  isIndexable,
  getPrerenderRoutes,
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

async function fetchAllCptSlugs(cpt: string): Promise<string[]> {
  const base = wpApiBase();
  return collectCptSlugs(cpt, async (page) => {
    const response = await $fetch.raw<unknown>(`${base}/wp/v2/${cpt}`, {
      timeout: 15_000,
      retry: 2,
      retryDelay: 500,
      retryStatusCodes: [408, 429, 500, 502, 503, 504],
      query: {
        page,
        per_page: WP_MAX_PER_PAGE,
        status: 'publish',
        _fields: 'slug',
      },
    });
    return { data: response._data, headers: response.headers };
  });
}

function mirrorEnRoutes(routes: string[]): string[] {
  return routes
    .filter((route) => route !== '/en' && !route.startsWith('/en/'))
    .map((route) => (route === '/' ? '/en' : `/en${route}`));
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  /** Dev has no `_payload.json`; disabling extraction avoids 404 on archive → detail nav. */
  experimental: {
    payloadExtraction: process.env.NODE_ENV === 'production',
    sharedPrerenderData: true,
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
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...(indexable
          ? []
          : [{ name: 'robots', content: 'noindex, nofollow' }]),
      ],
      link: [
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: publicAsset('fonts/JetBrainsMono-Regular.woff2'),
          crossorigin: 'anonymous',
        },
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
      failOnError: true,
      routes: [
        '/',
        '/portfolio',
        '/portfolio/legacy',
        '/about',
        '/services',
        '/contact',
        '/privacy-policy',
      ],
    },
  },
  hooks: {
    'pages:extend'(pages) {
      const enPages = [];
      for (const page of pages) {
        if (!page.path || !page.file) continue;
        if (page.path === '/en' || page.path.startsWith('/en/')) continue;
        const enPath = page.path === '/' ? '/en' : `/en${page.path}`;
        enPages.push({
          ...page,
          name: page.name ? `${page.name}-en` : undefined,
          path: enPath,
        });
      }
      pages.push(...enPages);
    },
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

      pushRoutes([
        '/',
        '/portfolio',
        '/portfolio/legacy',
        '/about',
        '/services',
        '/contact',
        '/privacy-policy',
      ]);

      pushRoutes(mirrorEnRoutes(existing));

      for (const cpt of ['portfolio', 'services']) {
        const slugs = await fetchAllCptSlugs(cpt);
        const routes = slugs.map((slug) => `/${cpt}/${slug}`);
        pushRoutes(routes);
        pushRoutes(mirrorEnRoutes(routes));
        console.info(`[prerender] queued ${routes.length} ${cpt} routes`);
      }

      setPrerenderRoutes(existing);
    },
    'nitro:init'(nitro) {
      if (!nitro.options.static) return;
      nitro.hooks.hook('prerender:done', () => {
        const routes = getPrerenderRoutes();
        const publicDir = nitro.options.output.publicDir;
        const count = verifyStaticOutput(publicDir, routes);
        writeFileSync(join(publicDir, '..', 'prerender-routes.json'), JSON.stringify(routes));
        console.info(`[ssg] verified ${count} HTML/payload route pairs`);
      });
    },
    'nitro:build:public-assets'(nitro) {
      const publicDir = nitro.options.output.publicDir;
      writeFileSync(join(publicDir, 'robots.txt'), buildRobotsTxt());
      writeFileSync(join(publicDir, 'sitemap.xml'), buildSitemapXml());
      console.info('[seo] wrote robots.txt and sitemap.xml');
    },
  },
});
