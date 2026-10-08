import type { ComponentProps, JSX } from "@solidjs/web";
import type { SidebarRowOverflow } from "../data-display/sidebar-section";

export interface DetailSidebarBadge {
  label: string;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "primary"
    | "secondary"
    | "outline";
}

export interface DetailSidebarHeader {
  initials: string;
  displayName: string;
  /**
   * Lines the name may wrap onto before it is clipped. Defaults to 1. A
   * clipped name shows in full when hovered.
   */
  displayNameLines?: 1 | 2 | 3;
  subtitle?: JSX.Element;
  badges?: DetailSidebarBadge[];
}

export interface DetailSidebarSection {
  title: string;
  action?: JSX.Element;
  rows: Array<{
    label: string;
    value: JSX.Element | string;
  }>;
}

export interface DetailSidebarSlimIcon {
  icon: JSX.Element;
  onClick?: () => void;
  href?: string;
  delay?: number;
}

export type DetailSidebarProps = ComponentProps<"div"> & {
  isSlim: boolean;
  onToggle: () => void;
  header: DetailSidebarHeader;
  sections: DetailSidebarSection[];
  slimIcons?: DetailSidebarSlimIcon[];
  footer?: JSX.Element;
  extraContent?: JSX.Element;
  loading?: boolean;
  /** How the section rows show long values. See `SidebarRow`'s `overflow`. */
  rowOverflow?: SidebarRowOverflow;
};
