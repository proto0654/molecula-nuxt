<script setup lang="ts">
withDefaults(
  defineProps<{
    index: number;
    label: string;
    /** Full-bleed visual field (slices) — body spans all 12 cols. */
    visual?: boolean;
    /** Center column cols 4–10 on lg (inner-pages screens). */
    center?: boolean;
  }>(),
  { visual: false, center: false },
);
</script>

<template>
  <section
    class="case-section case-grid"
    :class="{
      'case-section--visual': visual,
      'case-section--center': center,
    }"
  >
    <header class="case-section__index case-zone-label">
      <span class="case-section__num">{{ String(index).padStart(2, '0') }}</span>
      <span class="case-section__label">{{ label }}</span>
    </header>
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
