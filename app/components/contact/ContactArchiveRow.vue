<script setup lang="ts">
import type { Contact, ContactIcon } from '~/types/wp';
import { padCaseIndex } from '~/domain/portfolio/presentation';

const ICON_LABELS: Record<ContactIcon, string> = {
  telegram: 'Telegram',
  phone: 'Phone',
  vk: 'VK',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagram: 'Instagram',
  github: 'GitHub',
  facebook: 'Facebook',
  link: 'Link',
};

const props = defineProps<{
  contact: Contact;
  index: number;
}>();

const meta = computed(() => ICON_LABELS[props.contact.icon] ?? 'Link');
</script>

<template>
  <li class="archive-row archive-row--detail">
    <a
      class="archive-row__link"
      :href="contact.url"
      :target="contact.target"
      :rel="contact.target === '_blank' ? 'noopener noreferrer' : undefined"
    >
      <span class="archive-row__index">{{ padCaseIndex(index) }}</span>
      <span class="archive-row__copy">
        <span class="archive-row__title">{{ contact.label }}</span>
        <span class="archive-row__meta">
          <span class="archive-row__category">{{ meta }}</span>
          <span class="archive-row__line" aria-hidden="true" />
          <span class="archive-row__arrow" aria-hidden="true">→</span>
        </span>
      </span>
    </a>
  </li>
</template>
