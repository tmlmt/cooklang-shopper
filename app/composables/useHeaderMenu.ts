export interface HeaderMenuItem {
  label?: string;
  icon?: string;
  onSelect?: (e: Event) => void;
}

const headerMenuItems = ref<HeaderMenuItem[]>([]);

export function useHeaderMenu() {
  function setHeaderMenuItems(items: HeaderMenuItem[]) {
    headerMenuItems.value = items;
  }

  function clearHeaderMenuItems() {
    headerMenuItems.value = [];
  }

  return {
    headerMenuItems: readonly(headerMenuItems),
    setHeaderMenuItems,
    clearHeaderMenuItems,
  };
}
