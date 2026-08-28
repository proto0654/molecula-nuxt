<script setup lang="ts">
import type { ArchiveReturnScope } from '~/lib/navigation/archiveReturn';
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

const props = withDefaults(
  defineProps<{
    prevSlug: string | null;
    nextSlug: string | null;
    prevTitle?: string | null;
    nextTitle?: string | null;
    basePath: string;
    indexLabel: string;
    archiveScope?: ArchiveReturnScope;
    sectionIndex?: number;
    ariaLabel?: string;
  }>(),
  {
    archiveScope: 'portfolio',
    ariaLabel: 'Navigation',
  },
);

const archiveHref = ref(props.basePath);

onMounted(() => {
  archiveHref.value = archiveIndexHref(undefined, props.archiveScope);
});

const isCase = computed(() => props.sectionIndex != null && props.sectionIndex > 0);

function itemHref(slug: string) {
  return `${props.basePath}/${slug}`;
}
</script>

<template>
  <nav
    class="case-nav"
    :class="{
      'case-nav--archive': !isCase,
      'case-section case-grid case-section--tone-editorial': isCase,
    }"
    :data-enter="isCase ? undefined : 'tail'"
    :aria-label="ariaLabel"
  >
    <CaseSectionMarker
      v-if="isCase"
      class="case-zone-label"
      :index="sectionIndex!"
      label="Next"
      tone="editorial"
    />

    <div
      v-else
      class="case-nav__decor case-zone-label"
      aria-hidden="true"
    />

    <div class="case-nav__links">
      <div class="case-nav__motion">
        <div class="case-nav__flow">
          <div class="case-nav__item case-nav__next">
            <NuxtLink
              v-if="nextSlug"
              :to="itemHref(nextSlug)"
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
              :to="itemHref(prevSlug)"
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
        </div>

        <div class="case-nav__item case-nav__index">
          <NuxtLink :to="archiveHref" class="case-nav__link">
            <span class="case-nav__dir">Index</span>
            {{ indexLabel }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
