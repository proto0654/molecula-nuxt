import assert from 'node:assert/strict';
import test from 'node:test';
import { createDisposalScope } from './disposalScope.ts';

test('releases partially acquired resources in reverse order exactly once', () => {
  const scope = createDisposalScope();
  const released = [];
  scope.add(() => released.push('canvas'));
  scope.add(() => released.push('renderer'));
  scope.add(() => released.push('listeners'));
  scope.dispose();
  scope.dispose();
  assert.deepEqual(released, ['listeners', 'renderer', 'canvas']);
  assert.throws(() => scope.add(() => {}), /after hero disposal/);
});

test('a failing disposer does not prevent remaining cleanup', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const scope = createDisposalScope();
  let cleaned = false;
  scope.add(() => { cleaned = true; });
  scope.add(() => { throw new Error('Cleanup failed'); });
  scope.dispose();
  assert.equal(cleaned, true);
  assert.equal(errors.mock.calls.length, 1);
});
