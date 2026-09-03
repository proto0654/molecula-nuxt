import { localeFromPath } from '~/domain/i18n';

export default defineNuxtRouteMiddleware((to) => {
  const locale = localeFromPath(to.path);
  useState('site-locale', () => locale).value = locale;

  useHead({
    htmlAttrs: {
      lang: locale,
    },
  });
});
