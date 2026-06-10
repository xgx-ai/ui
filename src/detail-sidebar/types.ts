import type { ComponentProps, JSX } from "@solidjs/web";

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
};
