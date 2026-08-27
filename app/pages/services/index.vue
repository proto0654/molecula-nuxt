<script setup lang="ts">
const { revealing } = usePageContentReveal();

useSeoMeta({
  title: 'Услуги — WebLaba',
  description: 'Услуги WebLaba',
});
</script>

<template>
  <SectionShell meta="SERVICES" :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Index</p>
      <SiteScrambleTitle class="archive-heading__title" text="Услуги" />
    </header>
    <p class="archive-status">Раздел в работе.</p>
  </SectionShell>
</template>
