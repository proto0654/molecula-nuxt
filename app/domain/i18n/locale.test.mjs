import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryHistory, createRouter } from 'vue-router';
import { alternateLocalePath } from './locale.ts';

for (const base of ['/', '/molecula-nuxt/']) {
  test(`locale links retain route, query and fragment under ${base}`, async () => {
    const router = createRouter({ history: createMemoryHistory(base), routes: [{ path: '/:pathMatch(.*)*', component: {} }] });
    await router.push('/portfolio?page=2#projects');
    const target = alternateLocalePath(router.currentRoute.value.fullPath, 'en');
    assert.equal(target, '/en/portfolio?page=2#projects');
    assert.equal(router.resolve(target).href, `${base}en/portfolio?page=2#projects`);
    await router.push(target);
    assert.equal(alternateLocalePath(router.currentRoute.value.fullPath, 'ru'), '/portfolio?page=2#projects');
  });
}

test('preserves fragments containing question marks and complete query strings', () => {
  assert.equal(alternateLocalePath('/about#why?this', 'en'), '/en/about#why?this');
  assert.equal(alternateLocalePath('/en/services?q=a?b#offer', 'ru'), '/services?q=a?b#offer');
  assert.equal(alternateLocalePath('/en', 'ru'), '/');
  assert.equal(alternateLocalePath('/', 'en'), '/en/');
});
