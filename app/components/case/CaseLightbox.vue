<script setup lang="ts">
import { createFocusTrap, setPageInert } from '~/lib/a11y/focusTrap';

const lightbox = useCaseLightbox();
const panelRef = ref<HTMLElement | null>(null);

const { locale } = useLocale();

const dialogLabelFallback = useUiString('screenshot_lightbox_dialog_label');
const closeAria = useUiString('screenshot_lightbox_close_aria');
const navAria = useUiString('screenshot_lightbox_toggle_aria');

const prevLabel = computed(() => (locale.value === 'en' ? 'Back' : 'Назад'));
const nextLabel = computed(() => (locale.value === 'en' ? 'Forward' : 'Вперёд'));
const closeLabel = computed(
  () => closeAria.value || (locale.value === 'en' ? 'Close' : 'Закрыть'),
);
const prevNavAria = computed(() =>
  locale.value === 'en' ? 'Previous screenshot' : `${navAria.value}: предыдущее`,
);
const nextNavAria = computed(() =>
  locale.value === 'en' ? 'Next screenshot' : `${navAria.value}: следующее`,
);

let trap: ReturnType<typeof createFocusTrap> | null = null;
let triggerEl: HTMLElement | null = null;

function onKey(e: KeyboardEvent) {
  if (!lightbox.state.open) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    lightbox.next();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    lightbox.prev();
  }
}

watch(
  () => lightbox.state.open,
  (open) => {
    if (open) {
      triggerEl =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setPageInert(true);
      nextTick(() => {
        const panel = panelRef.value;
        if (!panel) return;
        trap = createFocusTrap(panel, { onEscape: () => lightbox.close() });
        trap.activate();
        panel.querySelector<HTMLElement>('button')?.focus();
      });
      return;
    }

    trap?.deactivate();
    trap = null;
    setPageInert(false);
    triggerEl?.focus();
    triggerEl = null;
  },
);

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  trap?.deactivate();
  setPageInert(false);
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
      :aria-label="lightbox.current.label || dialogLabelFallback"
    >
      <button
        type="button"
        class="case-lightbox__backdrop"
        :aria-label="closeAria"
        @click="lightbox.close"
      />
      <div ref="panelRef" class="case-lightbox__panel">
        <header class="case-lightbox__bar">
          <p class="case-lightbox__index">{{ lightbox.current.label }}</p>
          <div class="case-lightbox__actions">
            <template v-if="lightbox.hasMultiple">
              <button
                type="button"
                class="case-lightbox__nav"
                :aria-label="prevNavAria"
                @click="lightbox.prev"
              >
                {{ prevLabel }}
              </button>
              <button
                type="button"
                class="case-lightbox__nav"
                :aria-label="nextNavAria"
                @click="lightbox.next"
              >
                {{ nextLabel }}
              </button>
            </template>
            <button
              type="button"
              class="case-lightbox__close"
              :aria-label="closeAria"
              @click="lightbox.close"
            >
              {{ closeLabel }}
            </button>
          </div>
        </header>
        <div class="case-lightbox__stage">
          <img
            v-if="lightbox.currentUrl"
            class="case-lightbox__img"
            :src="lightbox.currentUrl"
            :srcset="lightbox.currentSrcSet ?? undefined"
            :sizes="lightbox.currentSrcSet ? '100vw' : undefined"
            :alt="lightbox.current.image.alt || lightbox.current.label"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
