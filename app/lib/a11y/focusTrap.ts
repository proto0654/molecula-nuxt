/** Minimal focus trap for modal dialogs (Tab cycle + optional Escape). */
export type FocusTrap = {
  activate: () => void;
  deactivate: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createFocusTrap(
  container: HTMLElement,
  options?: { onEscape?: () => void },
): FocusTrap {
  let previousFocus: HTMLElement | null = null;

  function focusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      options?.onEscape?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusableElements();
    if (items.length === 0) return;

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      container.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      container.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
      previousFocus = null;
    },
  };
}

/** Toggle inert on background roots while a modal is open. */
export function setPageInert(inert: boolean): void {
  const main = document.getElementById('main');
  const chrome = document.querySelector('.molecular-chrome');
  for (const el of [main, chrome]) {
    if (!el) continue;
    if (inert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }
}
