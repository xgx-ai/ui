import type { JSX } from "@solidjs/web";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  Circle,
  Contrast,
  Eye,
  Moon,
  PanelLeft,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
} from "../icons.index";
import { createSignal } from "solid-js";

import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMain,
  SidebarNav,
  SidebarNavItem,
} from "../navigation/sidebar.tsx";
import {
  IconButton,
  ToolbarIconButton,
  ToolbarSurface,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "../shell-controls.tsx";

const lightTokens = `
  --background: oklch(0.99 0.01 95);
  --foreground: oklch(0.21 0.02 260);
  --primary: oklch(0.44 0.12 250);
  --primary-foreground: oklch(0.99 0.01 95);
  --muted: oklch(0.94 0.01 250);
  --muted-foreground: oklch(0.47 0.02 260);
  --accent: oklch(0.9 0.04 180);
  --accent-foreground: oklch(0.2 0.03 190);
  --destructive: oklch(0.58 0.2 25);
  --destructive-foreground: oklch(0.99 0.01 95);
  --border: oklch(0.86 0.02 250);
  --ring: oklch(0.62 0.12 250);
  --sidebar: oklch(0.97 0.01 250);
  --sidebar-foreground: oklch(0.23 0.02 260);
  --sidebar-primary: oklch(0.37 0.13 250);
  --sidebar-primary-foreground: oklch(0.99 0.01 95);
  --sidebar-accent: oklch(0.89 0.04 180);
  --sidebar-accent-foreground: oklch(0.2 0.03 190);
  --sidebar-border: oklch(0.84 0.02 250);
  --sidebar-ring: oklch(0.62 0.12 250);
`;

const darkTokens = `
  --background: oklch(0.18 0.02 260);
  --foreground: oklch(0.96 0.01 95);
  --primary: oklch(0.72 0.12 250);
  --primary-foreground: oklch(0.18 0.02 260);
  --muted: oklch(0.27 0.02 260);
  --muted-foreground: oklch(0.75 0.02 260);
  --accent: oklch(0.33 0.05 180);
  --accent-foreground: oklch(0.96 0.01 95);
  --destructive: oklch(0.68 0.18 25);
  --destructive-foreground: oklch(0.16 0.02 260);
  --border: oklch(0.34 0.02 260);
  --ring: oklch(0.72 0.12 250);
  --sidebar: oklch(0.15 0.02 260);
  --sidebar-foreground: oklch(0.94 0.01 95);
  --sidebar-primary: oklch(0.72 0.12 250);
  --sidebar-primary-foreground: oklch(0.16 0.02 260);
  --sidebar-accent: oklch(0.29 0.05 180);
  --sidebar-accent-foreground: oklch(0.96 0.01 95);
  --sidebar-border: oklch(0.3 0.02 260);
  --sidebar-ring: oklch(0.72 0.12 250);
`;

const calmControlTokens = `
  --control: oklch(0.92 0.03 205);
  --control-foreground: oklch(0.21 0.03 205);
  --control-muted: transparent;
  --control-muted-foreground: oklch(0.39 0.03 220);
  --control-hover: oklch(0.82 0.05 205);
  --control-hover-foreground: oklch(0.17 0.03 205);
  --control-active: oklch(0.27 0.08 220);
  --control-active-foreground: oklch(0.98 0.01 95);
  --control-border: oklch(0.75 0.04 205);
`;

const contrastControlTokens = `
  --control: oklch(0.26 0.06 35);
  --control-foreground: oklch(0.98 0.01 95);
  --control-muted: transparent;
  --control-muted-foreground: oklch(0.86 0.05 75);
  --control-hover: oklch(0.73 0.12 75);
  --control-hover-foreground: oklch(0.16 0.02 35);
  --control-active: oklch(0.98 0.01 95);
  --control-active-foreground: oklch(0.18 0.02 35);
  --control-border: oklch(0.58 0.08 55);
`;

export function ShellControlsShowcase(): JSX.Element {
  const [dark, setDark] = createSignal(false);
  const [contrastControls, setContrastControls] = createSignal(false);

  return (
    <div
      class="min-h-screen bg-background text-foreground"
      style={`${dark() ? darkTokens : lightTokens} ${
        contrastControls() ? contrastControlTokens : calmControlTokens
      }`}
    >
      <Sidebar>
        <SidebarHeader>
          <IconButton aria-label="Panel" variant="solid" shape="circle" pressed>
            <PanelLeft />
          </IconButton>
        </SidebarHeader>
        <SidebarNav aria-label="Demo sections">
          <SidebarNavItem active title="Overview" href="#overview">
            <Eye class="size-4" />
          </SidebarNavItem>
          <SidebarNavItem title="Search" href="#search">
            <Search class="size-4" />
          </SidebarNavItem>
          <SidebarNavItem title="Settings" href="#settings">
            <Settings class="size-4" />
          </SidebarNavItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarNavItem shape="circle" title="Alerts" href="#alerts">
            <Bell class="size-4" />
          </SidebarNavItem>
        </SidebarFooter>
      </Sidebar>
      <SidebarMain>
        <div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
          <section class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <ToolbarSurface>
                <ToolbarIconButton
                  aria-label="Light theme"
                  pressed={!dark()}
                  onClick={() => setDark(false)}
                >
                  <Sun />
                </ToolbarIconButton>
                <ToolbarIconButton
                  aria-label="Dark theme"
                  pressed={dark()}
                  onClick={() => setDark(true)}
                >
                  <Moon />
                </ToolbarIconButton>
              </ToolbarSurface>
              <ToolbarSurface>
                <ToolbarIconButton
                  aria-label="Calm controls"
                  pressed={!contrastControls()}
                  onClick={() => setContrastControls(false)}
                >
                  <Circle />
                </ToolbarIconButton>
                <ToolbarIconButton
                  aria-label="Contrast controls"
                  pressed={contrastControls()}
                  onClick={() => setContrastControls(true)}
                >
                  <Contrast />
                </ToolbarIconButton>
              </ToolbarSurface>
            </div>
          </section>

          <section class="space-y-3">
            <ToolbarSurface>
              <ToolbarIconButton aria-label="Open panel">
                <PanelLeft />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Search" pressed>
                <Search />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Filters">
                <SlidersHorizontal />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Loading" loading />
              <ToolbarIconButton aria-label="Disabled" disabled>
                <Settings />
              </ToolbarIconButton>
            </ToolbarSurface>

            <ToolbarToggleGroup defaultValue="center" aria-label="Alignment">
              <ToolbarToggleItem value="left" aria-label="Align left">
                <AlignLeft />
              </ToolbarToggleItem>
              <ToolbarToggleItem value="center" aria-label="Align center">
                <AlignCenter />
              </ToolbarToggleItem>
              <ToolbarToggleItem value="right" aria-label="Align right">
                <AlignRight />
              </ToolbarToggleItem>
            </ToolbarToggleGroup>
          </section>

          <section class="flex flex-wrap gap-3">
            <IconButton aria-label="Ghost">
              <Search />
            </IconButton>
            <IconButton aria-label="Surface" variant="surface">
              <Search />
            </IconButton>
            <IconButton aria-label="Solid" variant="solid">
              <Search />
            </IconButton>
            <IconButton aria-label="Danger" variant="danger">
              <Bell />
            </IconButton>
          </section>
        </div>
      </SidebarMain>
    </div>
  );
}
