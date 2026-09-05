import { normalizeThemeOptions, uiString as resolveUiString } from '~/domain/options';
import type { ThemeOptions } from '~/types/wp';
import type { UiStringKey } from '~/types/wp/uiStrings';

const EMPTY_OPTIONS: ThemeOptions = normalizeThemeOptions(undefined);

export function useThemeOptions() {
  const { locale } = useLocale();
  const { acf, pending, error, refresh } = useThemeOptionsAcfData();

  const options = computed(() =>
    acf.value ? normalizeThemeOptions(acf.value, locale.value) : EMPTY_OPTIONS,
  );

  function t(key: UiStringKey): string {
    return resolveUiString(options.value, key);
  }

  return {
    options,
    pending,
    error,
    refresh,
    t,
  };
}
