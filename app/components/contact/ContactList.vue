<script setup lang="ts">
import type { Contact } from '~/types/wp';

defineProps<{
  contacts: Contact[];
}>();
</script>

<template>
  <ul v-if="contacts.length" class="contact-list">
    <li
      v-for="contact in contacts"
      :key="contact.url"
      class="editorial-repeater-row contact-link"
    >
      <h3 class="editorial-repeater-row__title">
        <a
          class="contact-list__link"
          :href="contact.url"
          :target="contact.target"
          :rel="contact.target === '_blank' ? 'noopener noreferrer' : undefined"
        >
          {{ contact.label }}
        </a>
      </h3>
    </li>
  </ul>
</template>
