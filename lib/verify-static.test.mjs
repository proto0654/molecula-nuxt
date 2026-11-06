import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { stringify } from 'devalue';
import { verifyStaticOutput } from './verify-static.mjs';

const root = mkdtempSync(join(tmpdir(), 'molecule-ssg-'));
after(() => {
  assert.ok(root.startsWith(`${resolve(tmpdir())}${sep}molecule-ssg-`));
  rmSync(root, { recursive: true, force: true });
});

function writeRoute(route, initial = { _errors: {} }, payload = { data: {} }) {
  const directory = join(root, route);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.html'), `<html><script type="application/json" id="__NUXT_DATA__">${stringify(initial)}</script></html>`);
  writeFileSync(join(directory, '_payload.json'), stringify(payload));
}

test('verifies every expected HTML/payload pair and accepts empty content', () => {
  writeRoute('');
  writeRoute('en');
  assert.equal(verifyStaticOutput(root, ['/', '/en']), 2);
});

test('rejects missing detail routes or payload files', () => {
  assert.throws(() => verifyStaticOutput(root, ['/', '/missing']), /Invalid generated route: \/missing/);
  writeRoute('missing-payload');
  rmSync(join(root, 'missing-payload', '_payload.json'));
  assert.throws(() => verifyStaticOutput(root, ['/', '/missing-payload']), /Invalid generated route/);
});

test('rejects useAsyncData errors stored in inline HTML with successful extracted JSON', () => {
  writeRoute('broken', { _errors: { 'portfolio-archive-ru-current': { message: 'CMS failed', statusCode: 503 } } });
  assert.throws(() => verifyStaticOutput(root, ['/', '/broken']), /Invalid generated route: \/broken/);
});

test('rejects errors in extracted payload too', () => {
  writeRoute('broken-data', {}, { data: {}, error: { message: 'Failure' } });
  assert.throws(() => verifyStaticOutput(root, ['/', '/broken-data']), /Invalid generated route/);
});

test('rejects invalid manifests and traversal before reading files', () => {
  for (const routes of [[], ['/en'], ['/', '/../secret'], ['/', '/%2e%2e/secret'], ['/', '/bad?query']]) {
    assert.throws(() => verifyStaticOutput(root, routes), /\[ssg\]/);
  }
});
