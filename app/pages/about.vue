<script setup lang="ts">
const { revealing } = usePageContentReveal();

useSeoMeta({
  title: 'О нас — WebLaba',
  description: 'О студии WebLaba',
});
</script>

<template>
  <SectionShell meta="ABOUT" :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Section</p>
      <SiteScrambleTitle class="archive-heading__title" text="О нас" />
    </header>
    <p class="archive-status">Раздел в работе.</p>
  </SectionShell>
</template>
