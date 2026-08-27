<script setup lang="ts">
import type { AboutSkill } from '~/types/wp';
import { padCaseIndex } from '~/domain/portfolio/presentation';

defineProps<{
  skill: AboutSkill;
  index: number;
}>();
</script>

<template>
  <li class="archive-row archive-row--detail">
    <div class="archive-row__link">
      <span class="archive-row__index">{{ padCaseIndex(index) }}</span>
      <span class="archive-row__copy">
        <span v-if="skill.title" class="archive-row__title">{{ skill.title }}</span>
        <span class="archive-row__meta">
          <span class="archive-row__category">Skill</span>
          <span class="archive-row__line" aria-hidden="true" />
          <span class="archive-row__arrow" aria-hidden="true">→</span>
        </span>
        <div
          v-if="skill.textHtml"
          class="archive-row__body case-content__prose"
          v-html="skill.textHtml"
        />
      </span>
    </div>
  </li>
</template>
