import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  onMounted(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      matches.value = mql.matches;
    };
    onChange();
    mql.addEventListener('change', onChange);
    onUnmounted(() => mql.removeEventListener('change', onChange));
  });

  return matches;
}
