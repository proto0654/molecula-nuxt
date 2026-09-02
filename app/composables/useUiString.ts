import type { UiStringKey } from '~/types/wp/uiStrings';

/** Theme UI string with in-code fallback when WP field is empty. */
export function useUiString(key: UiStringKey, fallback: string) {
  const { t } = useThemeOptions();
  return computed(() => t(key) || fallback);
}
