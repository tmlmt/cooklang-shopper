import type { DropdownMenuItem } from "@nuxt/ui";

type HeaderMenuItem = Omit<DropdownMenuItem, "children"> & {
  mobileOnly?: boolean;
};

type MenuGroup = Omit<DropdownMenuItem, "children">[];

const mobileHeaderMenuItems = ref<MenuGroup[]>([]);
const desktopHeaderMenuItems = ref<MenuGroup[]>([]);
const headerActionItems = ref<Omit<DropdownMenuItem, "children">[]>([]);

export function useHeaderMenu() {
  function setHeaderMenuItems(items: HeaderMenuItem[] | HeaderMenuItem[][]) {
    const groups: HeaderMenuItem[][] = Array.isArray(items[0])
      ? (items as HeaderMenuItem[][])
      : [items as HeaderMenuItem[]];

    for (const group of groups) {
      const mobileGroup: MenuGroup = group.map(
        ({ mobileOnly, ...item }) => item,
      );
      const desktopGroup: MenuGroup = group
        .filter((item) => !item.mobileOnly)
        .map(({ mobileOnly, ...item }) => item);

      if (mobileGroup.length > 0) {
        mobileHeaderMenuItems.value.push(mobileGroup);
      }
      if (desktopGroup.length > 0) {
        desktopHeaderMenuItems.value.push(desktopGroup);
      }
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
