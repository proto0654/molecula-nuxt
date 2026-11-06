import assert from 'node:assert/strict';
import test from 'node:test';
import { collectCptSlugs, collectPostsByIds } from './collections.ts';

const ids = (count) => Array.from({ length: count }, (_, i) => i + 1);
function page(data, total = data.length) {
  return { data, headers: new Headers({ 'x-wp-total': String(total), 'x-wp-totalpages': String(Math.ceil(total / 100)) }) };
}

for (const count of [0, 1, 100, 101, 201]) {
  test(`fetches ${count} posts completely within WP limits and preserves order`, async () => {
    const calls = [];
    const input = ids(count).reverse();
    const posts = await collectPostsByIds(input, async (batch) => {
      calls.push(batch.length);
      return [...batch].reverse().map((id) => ({ id }));
    });
    assert.deepEqual(posts.map((post) => post.id), input);
    assert.equal(calls.length, Math.ceil(count / 100));
    assert.ok(calls.every((size) => size > 0 && size <= 100));
  });
}

test('preserves duplicate requested positions without refetching ids', async () => {
  const result = await collectPostsByIds([2, 1, 2], async (batch) => {
    assert.deepEqual(batch, [2, 1]);
    return batch.map((id) => ({ id }));
  });
  assert.deepEqual(result.map((post) => post.id), [2, 1, 2]);
});

test('rejects missing posts instead of returning a partial archive', async () => {
  await assert.rejects(collectPostsByIds([1, 2], async () => [{ id: 1 }]), /Incomplete posts batch/);
});

test('propagates a failed later batch without retrying a different sort', async () => {
  let calls = 0;
  const failure = new Error('CMS unavailable');
  await assert.rejects(collectPostsByIds(ids(101), async (batch) => {
    calls += 1;
    if (calls === 2) throw failure;
    return batch.map((id) => ({ id }));
  }), (error) => error === failure);
  assert.equal(calls, 2);
});

test('only falls back when WP rejects the include order parameter', async () => {
  const calls = [];
  const result = await collectPostsByIds([7], async (_batch, orderByInclude) => {
    calls.push(orderByInclude);
    if (orderByInclude) throw { data: { code: 'rest_invalid_param', data: { params: { orderby: 'Unsupported' } } } };
    return [{ id: 7 }];
  });
  assert.deepEqual(calls, [true, false]);
  assert.deepEqual(result, [{ id: 7 }]);
});

test('does not retry invalid per_page errors as sorting errors', async () => {
  let calls = 0;
  await assert.rejects(collectPostsByIds([1], async () => {
    calls += 1;
    throw { data: { code: 'rest_invalid_param', data: { params: { per_page: 'Invalid' } } } };
  }));
  assert.equal(calls, 1);
});

test('accepts an explicitly empty published collection', async () => {
  assert.deepEqual(await collectCptSlugs('portfolio', async () => page([])), []);
});

test('collects all slug pages in order', async () => {
  const input = ids(101).map((id) => ({ slug: `case-${id}` }));
  assert.deepEqual(await collectCptSlugs('portfolio', async (n) => page(input.slice((n - 1) * 100, n * 100), 101)), input.map((post) => post.slug));
});

test('rejects network failures with CPT and page context', async () => {
  await assert.rejects(collectCptSlugs('services', async () => { throw new Error('503'); }), /services slugs \(page 1\)/);
});

test('rejects incomplete or duplicated slug pages', async () => {
  for (const data of [[{ slug: 'a' }], Array(100).fill({ slug: 'duplicate' })]) {
    await assert.rejects(collectCptSlugs('portfolio', async () => page(data, 100)), /Cannot collect/);
  }
});

test('rejects missing pagination metadata and malformed responses', async () => {
  for (const response of [{ data: [], headers: new Headers() }, page({}, 0), page([{ slug: 'valid' }], 2)]) {
    await assert.rejects(collectCptSlugs('portfolio', async () => response), /Cannot collect/);
  }
});

test('rejects a changing collection between pages', async () => {
  await assert.rejects(collectCptSlugs('portfolio', async (n) => page(ids(100).map((id) => ({ slug: `case-${id}` })), n === 1 ? 101 : 102)), /page 2/);
});

test('rejects unsafe slugs while retaining encoded Unicode slugs', async () => {
  for (const slug of ['../secret', '%2e%2e', 'foo%2fbar', 'bad?query', '%invalid']) {
    await assert.rejects(collectCptSlugs('portfolio', async () => page([{ slug }])), /Cannot collect/);
  }
  const slug = encodeURIComponent('пример');
  assert.deepEqual(await collectCptSlugs('portfolio', async () => page([{ slug }])), [slug]);
});
