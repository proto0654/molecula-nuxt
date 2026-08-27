<script setup lang="ts">
import type { ContactPage } from '~/types/wp';

defineProps<{
  page: ContactPage;
  sectionIndex: number;
}>();

const root = ref<HTMLElement | null>(null);

useCaseScrollEntry({
  root,
  preset: 'fade',
});
</script>

<template>
  <section
    v-if="page.contacts.length"
    ref="root"
    class="case-section case-grid case-section--tone-editorial contact-links"
  >
    <CaseSectionMarker
      class="case-zone-label"
      :index="sectionIndex"
      label="Links"
      tone="editorial"
    />
    <div class="case-section__body case-zone-body">
      <span class="case-scroll-trigger" aria-hidden="true" />
      <div class="case-scroll-motion">
        <h2 v-if="page.title" class="editorial-repeater__heading">
          {{ page.title }}
        </h2>
        <ContactList :contacts="page.contacts" />
      </div>
    </div>
  </section>
</template>
