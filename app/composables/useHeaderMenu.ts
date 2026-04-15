import type { DropdownMenuItem } from "@nuxt/ui";

interface HeaderMenuItem extends DropdownMenuItem {
  mobileOnly?: boolean;
}

const mobileHeaderMenuItems = ref<DropdownMenuItem[][]>([]);
const desktopHeaderMenuItems = ref<DropdownMenuItem[][]>([]);
const headerActionItems = ref<DropdownMenuItem[]>([]);

export function useHeaderMenu() {
  function setHeaderMenuItems(items: HeaderMenuItem[] | HeaderMenuItem[][]) {
    const groups: HeaderMenuItem[][] = Array.isArray(items[0])
      ? (items as HeaderMenuItem[][])
      : [items as HeaderMenuItem[]];

    for (const group of groups) {
      const mobileGroup: DropdownMenuItem[] = [];
      const desktopGroup: DropdownMenuItem[] = [];
      for (const item of group) {
        const { mobileOnly, ...rest }: { mobileOnly?: boolean } = item;
        mobileGroup.push(rest);
        if (!mobileOnly) {
          desktopGroup.push(rest);
        }
      }
      if (mobileGroup.length > 0) mobileHeaderMenuItems.value.push(mobileGroup);
      if (desktopGroup.length > 0)
        desktopHeaderMenuItems.value.push(desktopGroup);
    }
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
