<script setup lang="ts">
const { revealing } = usePageContentReveal();

useSeoMeta({
  title: 'Контакты — WebLaba',
  description: 'Контакты WebLaba',
});
</script>

<template>
  <SectionShell meta="CONTACT" :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Section</p>
      <SiteScrambleTitle class="archive-heading__title" text="Контакты" />
    </header>
    <p class="archive-status">Раздел в работе.</p>
  </SectionShell>
</template>
