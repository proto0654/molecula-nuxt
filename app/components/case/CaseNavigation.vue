<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

defineProps<{
  sectionIndex: number;
  prevSlug: string | null;
  nextSlug: string | null;
  prevTitle?: string | null;
  nextTitle?: string | null;
}>();

const archiveHref = ref('/portfolio');

onMounted(() => {
  archiveHref.value = archiveIndexHref();
});

const root = ref<HTMLElement | null>(null);

useCaseScrollEntry({
  root,
  preset: 'fade',
});
</script>

<template>
  <nav
    ref="root"
    class="case-section case-grid case-nav case-section--tone-editorial"
    aria-label="Case navigation"
  >
    <CaseSectionMarker
      class="case-zone-label"
      :index="sectionIndex"
      label="Next"
      tone="editorial"
    />
    <div class="case-nav__links">
      <span class="case-scroll-trigger" aria-hidden="true" />
      <div class="case-nav__motion case-scroll-motion">
        <div class="case-nav__item case-nav__next">
          <NuxtLink
            v-if="nextSlug"
            :to="`/portfolio/${nextSlug}`"
            class="case-nav__link"
          >
            <span class="case-nav__dir">Next</span>
            <span>{{ nextTitle || nextSlug }}</span>
          </NuxtLink>
          <span v-else class="case-nav__muted">
            <span class="case-nav__dir">Next</span>
            —
          </span>
        </div>

        <div class="case-nav__item case-nav__prev">
          <NuxtLink
            v-if="prevSlug"
            :to="`/portfolio/${prevSlug}`"
            class="case-nav__link"
          >
            <span class="case-nav__dir">Previous</span>
            <span>{{ prevTitle || prevSlug }}</span>
          </NuxtLink>
          <span v-else class="case-nav__muted">
            <span class="case-nav__dir">Previous</span>
            —
          </span>
        </div>

        <div class="case-nav__item case-nav__index">
          <NuxtLink :to="archiveHref" class="case-nav__link">
            <span class="case-nav__dir">Index</span>
            Back to portfolio
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
