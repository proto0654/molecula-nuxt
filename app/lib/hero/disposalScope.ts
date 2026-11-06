/** Own resources as they are acquired, including a partially mounted hero. */
export function createDisposalScope() {
  const disposers: Array<() => void> = [];
  let disposed = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const release of disposers.reverse()) {
      try {
        release();
      } catch (error) {
        console.error('[hero] Resource cleanup failed', error);
      }
    }
    disposers.length = 0;
  }

  return {
    add(release: () => void): void {
      if (disposed) throw new Error('Cannot acquire resources after hero disposal');
      disposers.push(release);
    },
    dispose,
  };
}
