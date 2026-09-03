import type { ScrollToTopSettings } from '~/types/wp';
import { stripLocalePrefix } from '~/domain/i18n';

export function useScrollToTopVisibility(settings: Ref<ScrollToTopSettings>) {
  const route = useRoute();

  const routeHidden = computed(() => {
    const path = stripLocalePrefix(route.path);
    return path === '/' || path === '/portfolio';
  });

  const enabled = computed(
    () => settings.value.enabled && !routeHidden.value,
  );

  return { enabled, routeHidden };
}

export function useScrollToTopState(settings: Ref<ScrollToTopSettings>) {
  const { enabled } = useScrollToTopVisibility(settings);
  const visible = ref(false);

  function onScroll() {
    if (!enabled.value) {
      visible.value = false;
      return;
    }
    visible.value = window.scrollY >= settings.value.triggerPx;
  }

  onMounted(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll);
  });

  watch(enabled, () => onScroll());

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { visible, enabled, scrollToTop };
}
