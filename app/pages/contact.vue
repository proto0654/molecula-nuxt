<script setup lang="ts">
import { contactExcerptPlain } from '~/domain/contacts';
import { contactHeroMedia } from '~/domain/editorialHero';

const { page, pending, error } = useContacts();
const { revealing } = usePageContentReveal();

const heroMedia = contactHeroMedia();

const pageDescription = computed(() => {
  if (!page.value) return 'Контакты WebLaba';
  return contactExcerptPlain(page.value) ?? 'Контакты WebLaba';
});

useSeoMeta({
  title: 'Контакты — WebLaba',
  description: pageDescription,
});
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <p v-if="pending && !page" class="archive-status">Loading…</p>

    <p v-else-if="error && !page" class="archive-status">
      Contacts unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="page">
      <EditorialHero :media="heroMedia">
        <header class="archive-heading">
          <p class="archive-heading__kicker">Index</p>
          <SiteScrambleTitle class="archive-heading__title" text="Контакты" />
        </header>

        <p v-if="page.text" class="archive-intro">{{ page.text }}</p>
      </EditorialHero>

      <h2 v-if="page.title && page.contacts.length" class="editorial-section-title">
        {{ page.title }}
      </h2>

      <ul v-if="page.contacts.length" class="archive-list">
        <ContactArchiveRow
          v-for="(contact, i) in page.contacts"
          :key="contact.url"
          :contact="contact"
          :index="i + 1"
        />
      </ul>
    </template>
  </ArchiveShell>
</template>
