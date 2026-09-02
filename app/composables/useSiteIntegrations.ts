/** GTM container + Organization JSON-LD from theme options. */
export function useSiteIntegrations() {
  const { options } = useThemeOptions();
  const route = useRoute();
  const config = useRuntimeConfig();
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '');

  const isHome = computed(() => {
    const path = route.path.replace(/\/+$/, '') || '/';
    return path === '/';
  });

  useHead({
    script: computed(() => {
      const scripts: Array<Record<string, unknown>> = [];
      const rawGtm = options.value.gtmContainerId?.trim();
      const gtmId = rawGtm && /^GTM-[A-Z0-9]+$/i.test(rawGtm) ? rawGtm : null;
      if (gtmId) {
        scripts.push({
          key: 'gtm',
          innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
          type: 'text/javascript',
        });
      }

      const schema = options.value.schemaOrg;
      if (isHome.value && schema.enabled) {
        const payload: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Organization',
        };
        if (schema.name) payload.name = schema.name;
        if (schema.url || siteUrl) payload.url = schema.url || siteUrl;
        if (schema.description) payload.description = schema.description;
        if (schema.telephone) payload.telephone = schema.telephone;
        if (schema.sameAs.length) payload.sameAs = schema.sameAs;

        scripts.push({
          key: 'schema-org',
          type: 'application/ld+json',
          innerHTML: JSON.stringify(payload),
        });
      }

      return scripts;
    }),
  });
}
