import {
  alternateLocalePath,
  localeFromPath,
  localizedPath as toLocalizedPath,
  type SiteLocale,
} from '~/domain/i18n';

const SITE_LOCALE_KEY = 'site-locale';

export function useLocale() {
  const route = useRoute();

  const locale = useState<SiteLocale>(SITE_LOCALE_KEY, () =>
    localeFromPath(route.path),
  );

  watch(
    () => route.path,
    (path) => {
      locale.value = localeFromPath(path);
    },
    { immediate: true },
  );

  const isEn = computed(() => locale.value === 'en');

  function localizedPath(path: string): string {
    return toLocalizedPath(path, locale.value);
  }

  function alternatePath(target?: SiteLocale): string {
    const next = target ?? (locale.value === 'en' ? 'ru' : 'en');
    return alternateLocalePath(route.fullPath, next);
  }

  return {
    locale,
    isEn,
    localizedPath,
    alternatePath,
  };
}
