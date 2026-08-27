<script setup lang="ts">
import type { Service, ServiceChrome } from '~/types/wp';

defineProps<{
  service: Service;
  chrome: ServiceChrome;
}>();
</script>

<template>
  <section v-if="service.offers.length" class="editorial-section service-offers">
    <h2 v-if="chrome.sectionHeading" class="editorial-section-title">
      {{ chrome.sectionHeading }}
    </h2>
    <ul class="archive-list">
      <ServiceOfferRow
        v-for="(offer, i) in service.offers"
        :key="offer.anchor"
        :offer="offer"
        :index="i + 1"
        :price-from="chrome.priceFrom"
        :order-label="chrome.orderLabel"
      />
    </ul>
  </section>
</template>
