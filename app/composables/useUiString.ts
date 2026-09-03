import type { UiStringKey } from '~/types/wp/uiStrings';
import { missingUiString } from '~/domain/options/missingUiString';

/**
 * Theme UI string. Empty Options → visible `[key]` (no silent RU hardcode).
 */
export function useUiString(key: UiStringKey) {
  const { t } = useThemeOptions();
  return computed(() => t(key) || missingUiString(key));
}
