import type { DropdownMenuItem } from "@nuxt/ui";

interface HeaderMenuItem extends DropdownMenuItem {
  mobileOnly?: boolean;
}

const mobileHeaderMenuItems = ref<DropdownMenuItem[]>([]);
const desktopHeaderMenuItems = ref<DropdownMenuItem[]>([]);
const headerActionItems = ref<DropdownMenuItem[]>([]);

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

  function setHeaderActions(items: DropdownMenuItem[]) {
    headerActionItems.value = items;
  }

  function clearHeaderActions() {
    headerActionItems.value = [];
  }

  return {
    mobileHeaderMenuItems: mobileHeaderMenuItems,
    desktopHeaderMenuItems: desktopHeaderMenuItems,
    headerActionItems: headerActionItems,
    setHeaderMenuItems,
    clearHeaderMenuItems,
    setHeaderActions,
    clearHeaderActions,
  };
}
