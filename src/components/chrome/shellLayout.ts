/** Dimensões do shell (header + sidebar). Manter sync em TopHeader, Sidebar e SidebarToggle. */
export const SHELL_SIDEBAR_WIDTH_PX = 176;
export const SHELL_SIDEBAR_COLLAPSED_CLASS = "w-16";
export const SHELL_SIDEBAR_WIDTH_CLASS = "w-[176px]";
export const SHELL_SIDEBAR_TOGGLE_LEFT_EXPANDED = "left-[176px]";
export const SHELL_HEADER_HEIGHT_CLASS = "h-14";
export const SHELL_HEADER_TOP_CLASS = "top-14";

export function shellSidebarToggleLeft(expanded: boolean): string {
  return expanded ? SHELL_SIDEBAR_TOGGLE_LEFT_EXPANDED : "left-16";
}

export function shellSidebarWidthClass(expanded: boolean): string {
  return expanded ? SHELL_SIDEBAR_WIDTH_CLASS : SHELL_SIDEBAR_COLLAPSED_CLASS;
}

export function shellHeaderBrandWidthClass(expanded: boolean): string {
  return expanded
    ? `${SHELL_SIDEBAR_WIDTH_CLASS} gap-3 pl-5`
    : `${SHELL_SIDEBAR_COLLAPSED_CLASS} justify-center`;
}
