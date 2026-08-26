<script setup lang="ts">
import type { CaseSectionTone } from '~/domain/portfolio/presentation';

withDefaults(
  defineProps<{
    index: number;
    label: string;
    /** Full-bleed visual field — body spans all 12 cols. */
    visual?: boolean;
    /** Center column cols 4–10 on lg (inner-pages screens). */
    center?: boolean;
    tone?: CaseSectionTone;
  }>(),
  { visual: false, center: false, tone: 'editorial' },
);
</script>

<template>
  <section
    class="case-section case-grid"
    :class="{
      'case-section--visual': visual,
      'case-section--center': center,
      [`case-section--tone-${tone}`]: true,
    }"
  >
    <CaseSectionMarker
      class="case-zone-label"
      :index="index"
      :label="label"
      :tone="tone"
    />
    <div
      class="case-section__body"
      :class="
        visual
          ? 'case-zone-visual-field'
          : center
            ? 'case-zone-center'
            : 'case-zone-body'
      "
    >
      <slot />
    </div>
  </section>
</template>
