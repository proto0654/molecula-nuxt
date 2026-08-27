<script setup lang="ts">
import type { ServiceOffer } from '~/types/wp';
import { padCaseIndex } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    offer: ServiceOffer;
    index: number;
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
const metaLabel = computed(() => {
  if (props.offer.price) return `${fromLabel.value} ${props.offer.price}`;
  return 'Offer';
});
</script>

<template>
  <li class="archive-row archive-row--detail service-offer" :id="offer.anchor">
    <div class="archive-row__link">
      <span class="archive-row__index">{{ padCaseIndex(index) }}</span>
      <span class="archive-row__copy">
        <span v-if="offer.title" class="archive-row__title">
          <a class="archive-row__title-link" :href="`#${offer.anchor}`">{{ offer.title }}</a>
        </span>
        <span class="archive-row__meta">
          <span class="archive-row__category service-offer__price">{{ metaLabel }}</span>
          <span class="archive-row__line" aria-hidden="true" />
          <span class="archive-row__arrow" aria-hidden="true">→</span>
        </span>
        <div v-if="offer.textHtml || offer.price" class="archive-row__body">
          <div
            v-if="offer.textHtml"
            class="case-content__prose"
            v-html="offer.textHtml"
          />
          <p v-if="offer.price" class="service-offer__order">
            <NuxtLink to="/contact" class="editorial-cta-link">{{ ctaLabel }}</NuxtLink>
          </p>
        </div>
      </span>
    </div>
  </li>
</template>
