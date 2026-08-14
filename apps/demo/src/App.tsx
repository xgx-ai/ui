import {
  AppContent,
  AppMain,
  AppPageActions,
  AppPageHeader,
  AppPageHeading,
  AppShell,
  AppTopbar,
  Button,
  IconButton,
  Popover,
  PopoverContent,
  Sidebar,
  SidebarAccount,
  SidebarFooter,
  SidebarHeader,
  SidebarMain,
  SidebarNav,
  SidebarNavItem,
  Toaster,
  ToolbarIconButton,
  ToolbarSurface,
} from "@xgx/ui";
import { ChevronRight, Database, Home, Moon, Settings, Sun } from "@xgx/ui/icons";
import { createMemo, createRenderEffect, createSignal, For, onSettled } from "solid-js";
import {
  primarySections,
  records,
  type SectionId,
  sectionDescriptions,
  sections,
  type ThemeMode,
} from "./examples/catalog";
import {
  AccountPopoverContent,
  AdminPanel,
  AdvancedPanel,
  AiWorkspacePanel,
  AsyncRuntimePanel,
  AuthAccessPanel,
  ControlsPanel,
  CoveragePanel,
  DataPanel,
  DragDropPanel,
  FeedbackPanel,
  FormsPanel,
  FoundationsPanel,
  MapPanel,
  NavigationPanel,
  OverlaysPanel,
  ProfilePanel,
  ReportingPanel,
  SettingsPanel,
  SettingsPopoverContent,
  ShellPanel,
  WorkflowsPanel,
} from "./examples/panels";

const themeTokens = {
  light: `
    color-scheme: light;
    --background: oklch(0.985 0.004 250);
    --foreground: oklch(0.22 0.025 255);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.22 0.025 255);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.22 0.025 255);
    --surface: oklch(0.996 0.002 250);
    --surface-foreground: oklch(0.22 0.025 255);
    --surface-muted: oklch(0.956 0.006 250);
    --surface-muted-foreground: oklch(0.5 0.025 255);
    --surface-raised: oklch(1 0 0);
    --surface-raised-foreground: oklch(0.22 0.025 255);
    --primary: oklch(0.43 0.075 250);
    --primary-foreground: oklch(0.99 0.002 250);
    --secondary: oklch(0.93 0.018 250);
    --secondary-foreground: oklch(0.27 0.04 250);
    --muted: oklch(0.948 0.008 250);
    --muted-foreground: oklch(0.52 0.026 255);
    --accent: oklch(0.91 0.035 245);
    --accent-foreground: oklch(0.27 0.07 245);
    --destructive: oklch(0.58 0.19 28);
    --destructive-foreground: oklch(0.99 0.002 250);
    --danger: var(--destructive);
    --danger-foreground: var(--destructive-foreground);
    --info: oklch(0.91 0.04 240);
    --info-foreground: oklch(0.29 0.08 240);
    --success: oklch(0.9 0.08 150);
    --success-foreground: oklch(0.27 0.08 150);
    --warning: oklch(0.92 0.1 80);
    --warning-foreground: oklch(0.32 0.07 70);
    --error: oklch(0.9 0.07 30);
    --error-foreground: oklch(0.42 0.14 28);
    --border: oklch(0.89 0.012 250);
    --border-subtle: oklch(0.92 0.01 250);
    --border-strong: oklch(0.78 0.018 250);
    --input: oklch(0.86 0.012 250);
    --ring: oklch(0.5 0.08 250);
    --focus: var(--ring);
    --hover: oklch(0.94 0.014 250);
    --hover-foreground: oklch(0.22 0.025 255);
    --selected: var(--primary);
    --selected-foreground: var(--primary-foreground);
    --disabled: oklch(0.93 0.008 250);
    --disabled-foreground: oklch(0.58 0.02 255);
    --sidebar: oklch(1 0 0);
    --sidebar-foreground: oklch(0.34 0.03 255);
    --sidebar-primary: oklch(0.28 0.035 255);
    --sidebar-primary-foreground: oklch(0.99 0.002 250);
    --sidebar-accent: oklch(0.94 0.014 250);
    --sidebar-accent-foreground: oklch(0.24 0.03 255);
    --sidebar-border: oklch(0.9 0.01 250);
    --sidebar-ring: var(--ring);
    --chart-1: oklch(0.43 0.075 250);
    --chart-2: oklch(0.56 0.105 235);
    --chart-3: oklch(0.58 0.09 150);
    --chart-4: oklch(0.72 0.11 75);
    --chart-5: oklch(0.62 0.14 28);
    --chart-6: oklch(0.56 0.055 280);
    --chart-grid: oklch(0.9 0.01 250);
    --chart-axis: oklch(0.52 0.026 255);
  `,
  dark: `
    color-scheme: dark;
    --background: oklch(0.18 0.018 250);
    --foreground: oklch(0.95 0.01 95);
    --card: oklch(0.215 0.02 250);
    --card-foreground: oklch(0.95 0.01 95);
    --popover: oklch(0.225 0.02 250);
    --popover-foreground: oklch(0.95 0.01 95);
    --surface: oklch(0.205 0.02 250);
    --surface-foreground: oklch(0.95 0.01 95);
    --surface-muted: oklch(0.27 0.018 250);
    --surface-muted-foreground: oklch(0.88 0.012 250);
    --surface-raised: oklch(0.245 0.02 250);
    --surface-raised-foreground: oklch(0.96 0.01 95);
    --primary: oklch(0.72 0.11 245);
    --primary-foreground: oklch(0.08 0.012 250);
    --secondary: oklch(0.28 0.025 250);
    --secondary-foreground: oklch(0.96 0.01 95);
    --muted: oklch(0.29 0.018 250);
    --muted-foreground: oklch(0.88 0.012 250);
    --accent: oklch(0.32 0.04 245);
    --accent-foreground: oklch(0.96 0.01 95);
    --destructive: oklch(0.67 0.18 28);
    --destructive-foreground: oklch(0.16 0.018 250);
    --danger: var(--destructive);
    --danger-foreground: var(--destructive-foreground);
    --info: oklch(0.3 0.065 240);
    --info-foreground: oklch(0.9 0.04 240);
    --success: oklch(0.31 0.07 150);
    --success-foreground: oklch(0.96 0.06 150);
    --warning: oklch(0.41 0.09 80);
    --warning-foreground: oklch(0.92 0.1 80);
    --error: oklch(0.4 0.11 28);
    --error-foreground: oklch(0.9 0.07 30);
    --border: oklch(0.34 0.02 250);
    --border-subtle: oklch(0.29 0.02 250);
    --border-strong: oklch(0.43 0.024 250);
    --input: oklch(0.34 0.02 250);
    --ring: oklch(0.72 0.11 245);
    --focus: var(--ring);
    --hover: oklch(0.3 0.02 250);
    --hover-foreground: oklch(0.96 0.01 95);
    --selected: var(--primary);
    --selected-foreground: var(--primary-foreground);
    --disabled: oklch(0.26 0.018 250);
    --disabled-foreground: oklch(0.58 0.018 250);
    --sidebar: oklch(0.15 0.018 250);
    --sidebar-foreground: oklch(0.94 0.01 95);
    --sidebar-primary: oklch(0.72 0.11 245);
    --sidebar-primary-foreground: oklch(0.08 0.012 250);
    --sidebar-accent: oklch(0.28 0.025 250);
    --sidebar-accent-foreground: oklch(0.96 0.01 95);
    --sidebar-border: oklch(0.28 0.018 250);
    --sidebar-ring: var(--ring);
    --chart-1: oklch(0.72 0.11 245);
    --chart-2: oklch(0.68 0.11 220);
    --chart-3: oklch(0.68 0.11 150);
    --chart-4: oklch(0.78 0.12 80);
    --chart-5: oklch(0.7 0.15 28);
    --chart-6: oklch(0.7 0.08 285);
    --chart-grid: oklch(0.31 0.02 250);
    --chart-axis: oklch(0.72 0.018 250);
  `,
};

const shellControlTokens = `
  --control: var(--surface-raised);
  --control-foreground: var(--surface-raised-foreground);
  --control-muted: transparent;
  --control-muted-foreground: var(--muted-foreground);
  --control-hover: var(--hover);
  --control-hover-foreground: var(--hover-foreground);
  --control-active: var(--primary);
  --control-active-foreground: var(--primary-foreground);
  --control-border: var(--border-subtle);
`;

function isSectionId(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

function getSectionFromHash(): SectionId {
  if (typeof window === "undefined") return "foundations";

  const hash = window.location.hash.replace("#", "");
  return isSectionId(hash) ? hash : "foundations";
}

export default function App() {
  const [section, setSection] = createSignal<SectionId>(getSectionFromHash());
  const [theme, setTheme] = createSignal<ThemeMode>("light");
  const [savedView, setSavedView] = createSignal("all");
  const [search, setSearch] = createSignal("");
  const [progress, setProgress] = createSignal(68);
  const [selectedRecord, setSelectedRecord] = createSignal(records[1]);
  const [richText, setRichText] = createSignal(
    "<p>Use the editor for review notes, decisions, and handover context.</p>",
  );
  const [droppedFiles, setDroppedFiles] = createSignal("No files dropped");
  const [accountOpen, setAccountOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  createRenderEffect(theme, (themeMode) => {
    const root = document.documentElement;
    const declarations = `${themeTokens[themeMode]} ${shellControlTokens}`;
    const applied = new Set<string>();

    root.setAttribute("data-xgx-theme", "");
    for (const declaration of declarations.split(";")) {
      const [name, ...valueParts] = declaration.split(":");
      const value = valueParts.join(":").trim();
      const property = name?.trim();

      if (!property || !value) continue;

      if (property === "color-scheme") {
        root.style.colorScheme = value;
        applied.add(property);
        continue;
      }

      if (property.startsWith("--")) {
        root.style.setProperty(property, value);
        applied.add(property);
      }
    }

    return () => {
      for (const property of applied) {
        if (property === "color-scheme") {
          root.style.colorScheme = "";
        } else {
          root.style.removeProperty(property);
        }
      }
      root.removeAttribute("data-xgx-theme");
    };
  });

  const syncSectionFromHash = () => {
    setSection(getSectionFromHash());
  };

  onSettled(() => {
    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
  });

  const currentTitle = createMemo(
    () => sections.find((item) => item.id === section())?.label ?? "Foundations",
  );
  const currentDescription = createMemo(() => sectionDescriptions[section()]);

  const filteredRecords = createMemo(() => {
    const query = search().toLowerCase();
    return records.filter((record) => {
      const viewMatch =
        savedView() === "all" ||
        (savedView() === "review" && record.status === "Review") ||
        (savedView() === "blocked" && record.status === "Blocked");
      const searchMatch =
        !query ||
        `${record.id} ${record.name} ${record.owner} ${record.status}`
          .toLowerCase()
          .includes(query);
      return viewMatch && searchMatch;
    });
  });

  const goToSection = (id: SectionId) => {
    setSection(id);
    setAccountOpen(false);
    setSettingsOpen(false);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, left: 0 });
  };

  const renderSection = () => {
    switch (section()) {
      case "foundations":
        return <FoundationsPanel />;
      case "shell":
        return <ShellPanel />;
      case "ai":
        return <AiWorkspacePanel />;
      case "auth":
        return <AuthAccessPanel />;
      case "controls":
        return <ControlsPanel />;
      case "navigation":
        return <NavigationPanel goToSection={goToSection} section={section()} />;
      case "admin":
        return <AdminPanel goToSection={goToSection} />;
      case "forms":
        return <FormsPanel />;
      case "data":
        return (
          <DataPanel
            records={filteredRecords()}
            savedView={savedView()}
            search={search()}
            setSavedView={setSavedView}
            setSearch={setSearch}
            setSelectedRecord={setSelectedRecord}
          />
        );
      case "reporting":
        return <ReportingPanel theme={theme()} />;
      case "map":
        return <MapPanel theme={theme()} />;
      case "workflows":
        return (
          <WorkflowsPanel
            progress={progress()}
            setProgress={setProgress}
            selectedRecord={selectedRecord()}
          />
        );
      case "overlays":
        return <OverlaysPanel />;
      case "feedback":
        return <FeedbackPanel progress={progress()} setProgress={setProgress} />;
      case "async":
        return <AsyncRuntimePanel />;
      case "advanced":
        return (
          <AdvancedPanel
            richText={richText()}
            setRichText={setRichText}
            droppedFiles={droppedFiles()}
            setDroppedFiles={setDroppedFiles}
          />
        );
      case "dnd":
        return <DragDropPanel />;
      case "coverage":
        return <CoveragePanel />;
      case "profile":
        return <ProfilePanel goToSection={goToSection} />;
      case "settings":
        return <SettingsPanel theme={theme()} setTheme={setTheme} goToSection={goToSection} />;
    }
  };

  return (
    <AppShell style={`${themeTokens[theme()]} ${shellControlTokens}`}>
      <div class="hidden grid-cols-12 col-span-1 col-span-2 col-span-3 col-span-4 col-span-5 col-span-6" />
      <Sidebar>
        <SidebarHeader>
          <IconButton aria-label="Catalog home" variant="solid" shape="circle">
            <Home />
          </IconButton>
        </SidebarHeader>
        <SidebarNav aria-label="Catalog sections">
          <For each={primarySections}>
            {(item) => {
              const Icon = item.icon;
              return (
                <SidebarNavItem
                  as="button"
                  type="button"
                  title={item.label}
                  active={section() === item.id}
                  onClick={() => goToSection(item.id)}
                >
                  <Icon class="size-4" />
                </SidebarNavItem>
              );
            }}
          </For>
        </SidebarNav>
        <SidebarFooter>
          <Popover
            open={accountOpen()}
            onOpenChange={setAccountOpen}
            placement="right"
            class="block"
          >
            <SidebarAccount
              initials="VU"
              status="online"
              title="Verified user"
              class={
                section() === "profile"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : undefined
              }
              onClick={() => setAccountOpen(!accountOpen())}
            />
            <PopoverContent class="bottom-0 left-full ml-2 top-auto w-80 p-0">
              <AccountPopoverContent goToSection={goToSection} />
            </PopoverContent>
          </Popover>
          <Popover
            open={settingsOpen()}
            onOpenChange={setSettingsOpen}
            placement="right"
            class="block"
          >
            <SidebarNavItem
              as="button"
              type="button"
              shape="circle"
              title="Settings"
              active={section() === "settings"}
              onClick={() => setSettingsOpen(!settingsOpen())}
            >
              <Settings class="size-4" />
            </SidebarNavItem>
            <PopoverContent class="bottom-0 left-full ml-2 top-auto w-80 p-0">
              <SettingsPopoverContent
                theme={theme()}
                setTheme={setTheme}
                goToSection={goToSection}
              />
            </PopoverContent>
          </Popover>
        </SidebarFooter>
      </Sidebar>

      <SidebarMain>
        <AppTopbar>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="xgx-text-caption text-muted-foreground">Component system</span>
            <ChevronRight class="size-3 text-muted-foreground" />
            <span class="xgx-text-body-tight truncate font-medium">{currentTitle()}</span>
          </div>
          <ToolbarSurface aria-label="Theme">
            <ToolbarIconButton
              aria-label="Light theme"
              pressed={theme() === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun />
            </ToolbarIconButton>
            <ToolbarIconButton
              aria-label="Dark theme"
              pressed={theme() === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon />
            </ToolbarIconButton>
          </ToolbarSurface>
        </AppTopbar>

        <AppMain>
          <AppContent>
            <AppPageHeader>
              <AppPageHeading>
                <h1 class="xgx-text-page-title font-semibold tracking-tight">{currentTitle()}</h1>
                <p class="xgx-text-body max-w-2xl text-muted-foreground">{currentDescription()}</p>
              </AppPageHeading>
              <AppPageActions>
                <Button variant="outline" onClick={() => goToSection("coverage")}>
                  <Database />
                  Coverage
                </Button>
              </AppPageActions>
            </AppPageHeader>

            {renderSection()}
          </AppContent>
        </AppMain>
      </SidebarMain>
      <Toaster />
    </AppShell>
  );
}
