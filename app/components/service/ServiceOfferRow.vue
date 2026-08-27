<script setup lang="ts">
import type { ServiceOffer } from '~/types/wp';

const props = withDefaults(
  defineProps<{
    offer: ServiceOffer;
    priceFrom?: string | null;
    orderLabel?: string | null;
  }>(),
  {
    priceFrom: null,
    orderLabel: null,
  },
);

const fromLabel = computed(() => props.priceFrom || 'от');
const ctaLabel = computed(() => props.orderLabel || 'Заказать');
</script>

<template>
  <article class="editorial-repeater-row service-offer" :id="offer.anchor">
    <h3 v-if="offer.title" class="editorial-repeater-row__title">
      <a class="service-offer__anchor" :href="`#${offer.anchor}`">{{ offer.title }}</a>
    </h3>
    <div
      v-if="offer.textHtml"
      class="editorial-repeater-row__text case-content__prose"
      v-html="offer.textHtml"
    />
    <p v-if="offer.price" class="service-offer__price">
      <span class="service-offer__from">{{ fromLabel }}</span>
      <span class="service-offer__amount">{{ offer.price }}</span>
      <NuxtLink to="/contact" class="editorial-cta-link service-offer__cta">{{ ctaLabel }}</NuxtLink>
    </p>
  </article>
</template>
