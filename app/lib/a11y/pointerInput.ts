/** SSR-safe: assume mouse until the client can read media queries. */
export function prefersTouchInput(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  if (window.matchMedia('(hover: none)').matches) return true;
  return false;
}

export function subscribePointerInput(
  listener: (touch: boolean) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const coarse = window.matchMedia('(pointer: coarse)');
  const noHover = window.matchMedia('(hover: none)');
  const onChange = () => {
    listener(prefersTouchInput());
  };
  coarse.addEventListener('change', onChange);
  noHover.addEventListener('change', onChange);
  return () => {
    coarse.removeEventListener('change', onChange);
    noHover.removeEventListener('change', onChange);
  };
}
