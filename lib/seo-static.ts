/** Build robots.txt + sitemap.xml for static prerender (used from nuxt.config). */

let prerenderRoutes: string[] = [];

export function setPrerenderRoutes(routes: string[]): void {
  prerenderRoutes = [...routes];
}

function siteUrl(): string {
  return (process.env.NUXT_PUBLIC_SITE_URL || 'https://weblaba.ru').replace(
    /\/$/,
    '',
  );
}

function basePath(): string {
  const base = process.env.NUXT_APP_BASE_URL || '/';
  return base === '/' ? '' : base.replace(/\/$/, '');
}

function absoluteRoute(route: string): string {
  const origin = siteUrl();
  const base = basePath();
  if (route === '/') return `${origin}${base}/`;
  return `${origin}${base}${route}`;
}

export function buildRobotsTxt(): string {
  const sitemapUrl = `${absoluteRoute('/').replace(/\/$/, '')}/sitemap.xml`.replace(
    /([^:]\/)\/+/g,
    '$1',
  );
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

export function buildSitemapXml(routes: string[] = prerenderRoutes): string {
  const unique = [...new Set(routes)].sort((a, b) => a.localeCompare(b));
  const body = unique
    .map((route) => `  <url><loc>${absoluteRoute(route)}</loc></url>`)
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    '</urlset>\n'
  );
}

export function getPrerenderRoutes(): string[] {
  return prerenderRoutes;
}
