<script setup lang="ts">
import { routeChromeLabel } from '~/lib/navigation/routeChromeLabel';
import {
  archiveIndexHref,
  resolveCasePortfolioArchiveHref,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';
import { missingUiString } from '~/domain/options/missingUiString';
import { stripTags } from '~/domain/portfolio/presentation';
import type { EntityLightSweepDirection } from '~/composables/useMoleculeCue';
import { armFlipSweepDirection } from '~/lib/molecular/moleculeFlipIntent';
import type { UiStringKey } from '~/types/wp/uiStrings';

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
    ariaLabel: 'Навигация',
  },
);

const route = useRoute();
const { locale, localizedPath } = useLocale();

const archiveHref = computed(() => {
  if (props.archiveScope === 'services') {
    return archiveIndexHref(undefined, 'services', locale.value);
  }
  return (
    resolveCasePortfolioArchiveHref(route.path, locale.value) ??
    archiveIndexHref(undefined, props.archiveScope, locale.value)
  );
});

const { t } = useThemeOptions();

const sectionLabel = useUiString('case_nav_see_also');
const navNoneLabel = useUiString('case_nav_none');

/** Soft defaults until Options seeded (same pattern as service offer chrome). */
const SERVICE_NEXT_FALLBACK = 'Следующая услуга';
const SERVICE_PREV_FALLBACK = 'Предыдущая услуга';

function optionOrMissing(key: UiStringKey): string {
  return t(key) || missingUiString(key);
}

const nextLabel = computed(() => {
  if (props.archiveScope === 'services') {
    return t('services_nav_next_label') || SERVICE_NEXT_FALLBACK;
  }
  return optionOrMissing('case_nav_next_label');
});

const prevLabel = computed(() => {
  if (props.archiveScope === 'services') {
    return t('services_nav_prev_label') || SERVICE_PREV_FALLBACK;
  }
  return optionOrMissing('case_nav_prev_label');
});

const archiveDirLabel = computed(() => {
  const scope = props.archiveScope === 'services' ? 'services' : 'portfolio';
  const label = routeChromeLabel(localizedPath(`/${scope}`), scope);
  return label?.split('/')[0]?.trim() ?? '';
});

/** Numbered left rail (case + service detail). */
const hasMarker = computed(
  () => props.sectionIndex != null && props.sectionIndex > 0,
);

function navTo(slug: string, flipSweep: EntityLightSweepDirection) {
  return {
    path: localizedPath(`${props.basePath}/${slug}`),
    state: { flipSweep },
  };
}

function armSweep(direction: EntityLightSweepDirection) {
  armFlipSweepDirection(direction);
}

function plainTitle(title: string | null | undefined): string {
  if (!title) return '';
  return stripTags(title);
}
</script>

<template>
  <nav
    class="case-nav"
    :class="{
      'case-nav--archive': !hasMarker,
      'case-section case-grid case-section--tone-editorial': hasMarker,
    }"
    :data-enter="hasMarker ? undefined : 'tail'"
    :aria-label="ariaLabel"
  >
    <CaseSectionMarker
      v-if="hasMarker"
      class="case-zone-label"
      :index="sectionIndex!"
      :label="sectionLabel"
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
              :to="navTo(nextSlug, 1)"
              class="case-nav__link"
              @pointerdown.capture="armSweep(1)"
            >
              <span class="case-nav__dir">{{ nextLabel }}</span>
              <span class="case-nav__title">{{ plainTitle(nextTitle) || nextSlug }}</span>
            </NuxtLink>
            <span v-else class="case-nav__muted">
              <span class="case-nav__dir">{{ nextLabel }}</span>
              {{ navNoneLabel }}
            </span>
          </div>

          <div class="case-nav__item case-nav__prev">
            <NuxtLink
              v-if="prevSlug"
              :to="navTo(prevSlug, -1)"
              class="case-nav__link"
              @pointerdown.capture="armSweep(-1)"
            >
              <span class="case-nav__dir">{{ prevLabel }}</span>
              <span class="case-nav__title">{{ plainTitle(prevTitle) || prevSlug }}</span>
            </NuxtLink>
            <span v-else class="case-nav__muted">
              <span class="case-nav__dir">{{ prevLabel }}</span>
              {{ navNoneLabel }}
            </span>
          </div>
        </div>

        <div class="case-nav__item case-nav__index">
          <NuxtLink :to="archiveHref" class="case-nav__link">
            <span class="case-nav__dir">{{ archiveDirLabel }}</span>
            <span class="case-nav__title">{{ indexLabel }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
