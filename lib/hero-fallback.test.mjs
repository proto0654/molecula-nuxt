import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { compile, createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { parse } from '@vue/compiler-sfc';

const { descriptor } = parse(readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8'));
const render = compile(descriptor.template.content);

for (const status of ['pending', 'ready', 'failed']) {
  test(`home fallback is ${status === 'failed' ? 'visible' : 'absent'} during ${status}`, async () => {
    const app = createSSRApp(defineComponent({
      setup: () => ({ heroStatus: status, isHome: true, awaitingPose: false, pageInert: false }),
      render,
    }));
    app.component('SiteHeroFallback', { render: () => h('nav', { class: 'hero-fallback' }) });
    // Match Nuxt ClientOnly's server behavior; the actual layout controls the fallback.
    for (const name of ['ClientOnly', 'MolecularHero', 'SiteFooterMenu', 'SiteFooterLegal', 'SiteScrollToTop']) {
      app.component(name, { render: () => null });
    }
    const html = await renderToString(app);
    assert.equal(html.includes('class="hero-fallback"'), status === 'failed');
    assert.equal(html.includes('has-hero-fallback'), status === 'failed');
  });

  test(`client shell owns one chrome backend during ${status}`, async () => {
    const app = createSSRApp(defineComponent({
      setup: () => ({ heroStatus: status, isHome: true, awaitingPose: false, pageInert: false }),
      render,
    }));
    app.component('ClientOnly', { render() { return this.$slots.default?.(); } });
    app.component('SiteHeroFallback', { render: () => h('div', { 'data-backend': 'html' }) });
    app.component('MolecularHero', { render: () => h('div', { 'data-backend': 'webgl' }) });
    for (const name of ['SiteFooterMenu', 'SiteFooterLegal', 'SiteScrollToTop']) {
      app.component(name, { render: () => null });
    }
    const html = await renderToString(app);
    assert.equal((html.match(/data-backend=/g) ?? []).length, 1);
    assert.ok(html.includes(`data-backend="${status === 'failed' ? 'html' : 'webgl'}"`));
  });
}
