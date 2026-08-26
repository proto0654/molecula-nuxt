<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();

function heroUrl(c: Case): string | null {
  const img = c.landingScreen ?? c.featuredImage ?? c.screenshotImage;
  if (!img) return null;
  return img.sizes['weblaba-landing'] ?? img.sizes['weblaba-screen'] ?? img.url;
}
</script>

<template>
  <header class="mb-10 border-b border-[var(--wl-line)] pb-8">
    <p class="mb-2 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Case
    </p>
    <h1
      class="font-[family-name:var(--font-ui)] text-2xl tracking-[var(--track-title)] text-[var(--wl-accent)] md:text-4xl"
      v-html="caseData.title"
    />
    <dl
      v-if="caseData.client || caseData.technologies || caseData.projectUrl"
      class="mt-4 grid gap-2 text-sm text-[var(--wl-muted)] sm:grid-cols-2"
    >
      <div v-if="caseData.client">
        <dt class="text-[var(--text-meta)] uppercase tracking-[var(--track-meta)]">Client</dt>
        <dd>{{ caseData.client }}</dd>
      </div>
      <div v-if="caseData.technologies">
        <dt class="text-[var(--text-meta)] uppercase tracking-[var(--track-meta)]">Tech</dt>
        <dd>{{ caseData.technologies }}</dd>
      </div>
      <div v-if="caseData.projectUrl" class="sm:col-span-2">
        <dt class="text-[var(--text-meta)] uppercase tracking-[var(--track-meta)]">URL</dt>
        <dd>
          <a
            :href="caseData.projectUrl"
            class="text-[var(--wl-accent)] underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ caseData.projectUrl }}
          </a>
        </dd>
      </div>
    </dl>
    <div v-if="heroUrl(caseData)" class="mt-6 overflow-hidden border border-[var(--wl-line)]">
      <img
        :src="heroUrl(caseData)!"
        :alt="caseData.landingScreen?.alt || caseData.featuredImage?.alt || caseData.title"
        class="w-full"
        loading="eager"
      />
    </div>
  </header>
</template>
