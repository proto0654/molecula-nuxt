<script setup lang="ts">
import type { AboutSkill } from '~/types/wp';

defineProps<{
  skill: AboutSkill;
}>();
</script>

<template>
  <article class="editorial-repeater-row about-skill">
    <h3 v-if="skill.title" class="editorial-repeater-row__title">
      {{ skill.title }}
    </h3>
    <div
      v-if="skill.textHtml"
      class="editorial-repeater-row__text case-content__prose"
      v-html="skill.textHtml"
    />
  </article>
</template>
