type MenuKeyboardOptions = {
  close?: () => void;
  itemSelector?: string;
  root: () => HTMLElement | undefined;
  trigger?: () => HTMLElement | undefined;
};

const defaultItemSelector =
  "[role='menuitem']:not([data-disabled]), [role='menuitemcheckbox']:not([data-disabled]), [role='menuitemradio']:not([data-disabled])";

/**
 * The enabled items that belong to `root`, skipping items of menus nested inside it, such as
 * an unportalled submenu. `root` is usually the `[role=menu]` element, but any container works.
 */
export function getMenuItems(root: HTMLElement | undefined, selector = defaultItemSelector) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((item) => {
    const menu = item.closest("[role=menu]");
    return menu === root || !menu || !root.contains(menu);
  });
}

export function focusFirstMenuItem(root: HTMLElement | undefined, selector = defaultItemSelector) {
  getMenuItems(root, selector)[0]?.focus();
}

/**
 * Focuses the item at `index`, wrapping like arrow-key movement, so -1 is the last item.
 * Returns whether focus landed there; hidden content cannot take focus.
 */
export function focusMenuItemAt(
  root: HTMLElement | undefined,
  index: number,
  selector = defaultItemSelector,
): boolean {
  const items = getMenuItems(root, selector);
  if (items.length === 0) return false;
  const item = items[((index % items.length) + items.length) % items.length];
  item.focus();
  return document.activeElement === item;
}

export function createMenuKeyboard(options: MenuKeyboardOptions) {
  let typeahead = "";
  let clearTypeahead: ReturnType<typeof setTimeout> | undefined;
  const itemSelector = options.itemSelector ?? defaultItemSelector;

  const move = (direction: 1 | -1) => {
    const items = getMenuItems(options.root(), itemSelector);
    if (items.length === 0) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLElement));
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    items[nextIndex].focus();
  };

  const focusByText = (query: string) => {
    const match = getMenuItems(options.root(), itemSelector).find((item) =>
      item.textContent?.trim().toLowerCase().startsWith(query),
    );
    match?.focus();
  };

  return (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;

    if (event.key === "Escape") {
      event.preventDefault();
      options.close?.();
      options.trigger?.()?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      getMenuItems(options.root(), itemSelector)[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      getMenuItems(options.root(), itemSelector).at(-1)?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      const target = event.target as HTMLElement;
      if (target.matches(itemSelector)) {
        event.preventDefault();
        target.click();
      }
      return;
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      typeahead += event.key.toLowerCase();
      if (clearTypeahead) clearTimeout(clearTypeahead);
      clearTypeahead = setTimeout(() => {
        typeahead = "";
      }, 500);
      focusByText(typeahead);
    }
  };
}
