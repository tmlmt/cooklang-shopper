import type { DropdownMenuItem } from "@nuxt/ui";

interface HeaderMenuItem extends DropdownMenuItem {
  mobileOnly?: boolean;
}

const mobileHeaderMenuItems = ref<DropdownMenuItem[]>([]);
const desktopHeaderMenuItems = ref<DropdownMenuItem[]>([]);

export function useHeaderMenu() {
  function setHeaderMenuItems(items: HeaderMenuItem[]) {
    items.forEach((item) => {
      const { mobileOnly, ...rest }: { mobileOnly?: boolean } = item;
      mobileHeaderMenuItems.value.push(rest);
      if (!mobileOnly) {
        desktopHeaderMenuItems.value.push(rest);
      }
    });
  }

  function clearHeaderMenuItems() {
    mobileHeaderMenuItems.value = [];
    desktopHeaderMenuItems.value = [];
  }

  return {
    mobileHeaderMenuItems: readonly(mobileHeaderMenuItems),
    desktopHeaderMenuItems: readonly(desktopHeaderMenuItems),
    setHeaderMenuItems,
    clearHeaderMenuItems,
  };
}
