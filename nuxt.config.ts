import { $fetch } from 'ofetch';
import tailwindcss from '@tailwindcss/vite';

function wpApiBase(): string {
  return (
    process.env.NUXT_PUBLIC_WP_API_BASE ||
    'https://weblaba.ru/wp-json'
  ).replace(/\/$/, '');
}

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
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    // Set via NUXT_APP_BASE_URL for GitHub Pages (e.g. /molecula-nuxt/). Do not hardcode.
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Молекула',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      /** WordPress REST base. Override with NUXT_PUBLIC_WP_API_BASE. */
      wpApiBase: 'https://weblaba.ru/wp-json',
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
    },
  },
});
