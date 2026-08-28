<script setup lang="ts">
import { HOME_SEO_DESCRIPTION, HOME_SEO_TITLE } from '~/domain/seo/homeSeo';

usePageSeo({
  home: true,
  title: HOME_SEO_TITLE,
  description: HOME_SEO_DESCRIPTION,
});
</script>

<template>
  <div class="home-page">
    <div class="home-page__seo">
      <h1>{{ HOME_SEO_TITLE }}</h1>
      <p>{{ HOME_SEO_DESCRIPTION }}</p>
    </div>
  </div>
</template>
