import type { UiStringKey } from '~/types/wp/uiStrings';

/** Visible marker when an Options UI string is empty — no silent copy fallback. */
export function missingUiString(key: string): string {
  return `[${key}]`;
}

/** Prefer WP value; otherwise show `[key]`. */
export function uiOrMissing(
  value: string | null | undefined,
  key: UiStringKey | string,
): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || missingUiString(key);
}
