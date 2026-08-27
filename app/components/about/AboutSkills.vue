<script setup lang="ts">
import type { AboutPage } from '~/types/wp';

defineProps<{
  page: AboutPage;
}>();
</script>

<template>
  <section v-if="page.skills.length" class="editorial-section about-skills">
    <h2 v-if="page.sectionTitle" class="editorial-section-title">
      {{ page.sectionTitle }}
    </h2>
    <ul class="archive-list">
      <AboutSkillRow
        v-for="(skill, i) in page.skills"
        :key="skill.title || i"
        :skill="skill"
        :index="i + 1"
      />
    </ul>
  </section>
</template>
