<script setup lang="ts">
import type { AboutPage } from '~/types/wp';

defineProps<{
  page: AboutPage;
}>();
</script>

<template>
  <section v-if="page.skills.length" class="about-skills">
    <h2 v-if="page.sectionTitle" class="about-skills__heading">
      {{ page.sectionTitle }}
    </h2>
    <ul class="about-skills__list">
      <li
        v-for="(skill, i) in page.skills"
        :key="skill.title || i"
        class="about-skill"
      >
        <h3 v-if="skill.title" class="about-skill__title">{{ skill.title }}</h3>
        <div
          v-if="skill.textHtml"
          class="about-skill__text case-content__prose"
          v-html="skill.textHtml"
        />
      </li>
    </ul>
  </section>
</template>
