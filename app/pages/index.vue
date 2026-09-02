<script setup lang="ts">
import { HOME_SEO_DESCRIPTION, HOME_SEO_TITLE } from '~/domain/seo/homeSeo';

const homeTitle = useUiString('seo_hidden_h1', HOME_SEO_TITLE);
const homeDescription = computed(() => HOME_SEO_DESCRIPTION);

usePageSeo({
  home: true,
  title: homeTitle,
  description: homeDescription,
});
</script>

<template>
  <div class="home-page">
    <div class="home-page__seo">
      <h1>{{ homeTitle }}</h1>
      <p>{{ homeDescription }}</p>
    </div>
  </div>
</template>
