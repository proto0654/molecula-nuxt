<script setup lang="ts">
import { contactExcerptPlain } from '~/domain/contacts';

const { page, pending, error } = useContacts();
const { revealing } = usePageContentReveal();

const heading = 'Контакты';
const kicker = computed(() => page.value?.title || 'Section');
const pageDescription = computed(() => {
  if (!page.value) return 'Контакты WebLaba';
  return contactExcerptPlain(page.value) ?? 'Контакты WebLaba';
});

useSeoMeta({
  title: `${heading} — WebLaba`,
  description: pageDescription,
});
</script>

<template>
  <SectionShell meta="CONTACT" :revealing="revealing">
    <p v-if="pending && !page" class="archive-status">Loading…</p>

    <p
      v-else-if="error && !page"
      class="archive-status"
    >
      Contacts unavailable.<br />
      Try again later.
    </p>

    <article v-else-if="page" class="contact-page">
      <header class="archive-heading contact-heading">
        <p class="archive-heading__kicker">{{ kicker }}</p>
        <SiteScrambleTitle class="archive-heading__title" :text="heading" />
      </header>

      <p v-if="page.text" class="contact-intro">
        {{ page.text }}
      </p>

      <ContactList :contacts="page.contacts" />
    </article>
  </SectionShell>
</template>
