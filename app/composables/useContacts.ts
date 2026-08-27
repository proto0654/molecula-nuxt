import { getThemeOptions } from '~/api';
import { normalizeContactPage } from '~/domain/contacts';
import type { ContactPage } from '~/types/wp';

export function useContacts() {
  const { data, pending, error, refresh } = useAsyncData(
    'theme-contacts',
    async (): Promise<ContactPage> => {
      return normalizeContactPage(await getThemeOptions());
    },
  );

  return {
    page: computed(() => data.value ?? null),
    pending,
    error,
    refresh,
  };
}
