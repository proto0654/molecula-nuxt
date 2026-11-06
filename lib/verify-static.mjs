import { readFileSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'devalue';

// Decode Nuxt wrappers without instantiating Vue state in the build verifier.
const identity = (value) => value;
const revivers = Object.fromEntries(
  ['NuxtError', 'ShallowRef', 'ShallowReactive', 'Ref', 'Reactive'].map((key) => [key, identity]),
);
revivers.EmptyRef = revivers.EmptyShallowRef = () => undefined;

export function verifyStaticOutput(publicDir, routes) {
  const root = resolve(publicDir);
  if (!Array.isArray(routes) || !routes.length || !routes.includes('/')) {
    throw new Error('[ssg] Missing expected route manifest');
  }
  for (const route of new Set(routes)) {
    if (typeof route !== 'string' || !route.startsWith('/') || /[?#\\]/.test(route)) {
      throw new Error('[ssg] Invalid manifest route');
    }
    const decoded = decodeURIComponent(route);
    if (decoded.split('/').some((part) => part === '.' || part === '..')) {
      throw new Error('[ssg] Unsafe manifest route');
    }
    const directory = resolve(root, `.${decoded}`);
    const withinRoot = relative(root, directory);
    if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) {
      throw new Error('[ssg] Route escapes public output');
    }
    try {
      if (!statSync(join(directory, 'index.html')).isFile()) throw new Error('Missing HTML');
      const html = readFileSync(join(directory, 'index.html'), 'utf8');
      const inlineJson = html.match(/<script\b[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
      if (!inlineJson) throw new Error('Missing inline Nuxt payload');
      const initial = parse(inlineJson, revivers);
      const payload = parse(readFileSync(join(directory, '_payload.json'), 'utf8'), revivers);
      // Nuxt extracts data to JSON but keeps useAsyncData errors in inline HTML.
      if (!payload?.data || [initial, payload].some((part) => !part || part.error ||
        Object.values(part._errors ?? {}).some((error) => error != null))) {
        throw new Error('Payload contains a rendering or CMS error');
      }
    } catch (cause) {
      throw new Error(`[ssg] Invalid generated route: ${route}`, { cause });
    }
  }
  return new Set(routes).size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const publicDir = resolve('.output/public');
  const routes = JSON.parse(readFileSync('.output/prerender-routes.json', 'utf8'));
  console.info(`[ssg] Verified ${verifyStaticOutput(publicDir, routes)} HTML/payload route pairs`);
}
