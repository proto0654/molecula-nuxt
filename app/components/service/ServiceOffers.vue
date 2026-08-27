<script setup lang="ts">
import type { Service, ServiceChrome } from '~/types/wp';

defineProps<{
  service: Service;
  chrome: ServiceChrome;
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
    v-if="service.offers.length"
    ref="root"
    class="case-section case-grid case-section--tone-editorial service-offers"
  >
    <CaseSectionMarker
      class="case-zone-label"
      :index="sectionIndex"
      label="Offers"
      tone="editorial"
    />
    <div class="case-section__body case-zone-body">
      <span class="case-scroll-trigger" aria-hidden="true" />
      <div class="case-scroll-motion">
        <h2 v-if="chrome.sectionHeading" class="service-offers__heading">
          {{ chrome.sectionHeading }}
        </h2>
        <ServiceOfferRow
          v-for="offer in service.offers"
          :key="offer.anchor"
          :offer="offer"
          :price-from="chrome.priceFrom"
          :order-label="chrome.orderLabel"
        />
      </div>
    </div>
  </section>
</template>
