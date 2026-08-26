<script setup lang="ts">
const lightbox = useCaseLightbox();

function onKey(e: KeyboardEvent) {
  if (!lightbox.state.open) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    lightbox.close();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    lightbox.next();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    lightbox.prev();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  if (lightbox.state.open) lightbox.close();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="lightbox.state.open && lightbox.current"
      class="case-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="lightbox.current.label"
    >
      <button
        type="button"
        class="case-lightbox__backdrop"
        aria-label="Close"
        @click="lightbox.close"
      />
      <div class="case-lightbox__panel">
        <header class="case-lightbox__bar">
          <p class="case-lightbox__index">{{ lightbox.current.label }}</p>
          <div class="case-lightbox__actions">
            <template v-if="lightbox.hasMultiple">
              <button
                type="button"
                class="case-lightbox__nav"
                aria-label="Previous"
                @click="lightbox.prev"
              >
                Prev
              </button>
              <button
                type="button"
                class="case-lightbox__nav"
                aria-label="Next"
                @click="lightbox.next"
              >
                Next
              </button>
            </template>
            <button
              type="button"
              class="case-lightbox__close"
              aria-label="Close"
              @click="lightbox.close"
            >
              Close
            </button>
          </div>
        </header>
        <div class="case-lightbox__stage">
          <img
            v-if="lightbox.currentUrl"
            class="case-lightbox__img"
            :src="lightbox.currentUrl"
            :alt="lightbox.current.image.alt || lightbox.current.label"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
