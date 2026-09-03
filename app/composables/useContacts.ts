import { normalizeContactPage } from '~/domain/contacts';
import type { ContactPage } from '~/types/wp';

export function useContacts() {
  const { locale } = useLocale();
  const { acf, pending, error, refresh } = useThemeOptionsAcfData();

  const page = computed((): ContactPage | null =>
    acf.value ? normalizeContactPage(acf.value, locale.value) : null,
  );

  return {
    page,
    pending,
    error,
    refresh,
  };
}
