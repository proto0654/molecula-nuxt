<script setup lang="ts">
/** Closing thanks line from Theme Options `case_thanks_message`. Empty → omit. */
const { t } = useThemeOptions();

const message = computed(() => {
  const raw = t('case_thanks_message').trim();
  return raw.length > 0 ? raw : null;
});
</script>

<template>
  <p v-if="message" class="case-thanks case-grid" data-enter="tail">
    <span class="case-thanks__text">{{ message }}</span>
  </p>
</template>
