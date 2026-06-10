import { createMountEffect } from "../../src/utils/lifecycle";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Archive,
  Bell,
  Bot,
  BrainCircuit,
  CalendarRange,
  ChartColumn,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Columns3,
  Cpu,
  Database,
  Download,
  FileDown,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Home,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  ListChecks,
  MessageSquare,
  MessageSquareWarning,
  Moon,
  MoreHorizontal,
  PanelLeft,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Table2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  Wand2,
  Workflow,
  X,
} from "@xgx/ui/icons";
import type { JSX } from "@solidjs/web";
import {
  For,
  Loading,
  Show,
  action,
  createMemo,
  createOptimistic,
  createRenderEffect,
  createSignal,
} from "solid-js";
import { z } from "zod";

import {
  AppContent,
  AppMain,
  AppPageActions,
  AppPageHeader,
  AppPageHeading,
  AppShell,
  AppTopbar,
  AuthCard,
  AuthPage,
  Badge,
  BarChart,
  Button,
  Calendar,
  Callout,
  CalloutContent,
  CalloutTitle,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartPanel,
  Checkbox,
  CommandRegion,
  createForm,
  DataGrid,
  DataGridCell,
  DataGridText,
  DetailPanel,
  DetailSidebar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DocumentPreviewHeader,
  DocumentPreviewParty,
  DocumentPreviewShell,
  DocumentPreviewStatusBar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorAlert,
  FileDropzone,
  IconButton,
  LineChart,
  DonutChart,
  MetricCard,
  MetricGrid,
  NumberField,
  NumberFieldDecrementTrigger,
  NumberFieldGroup,
  NumberFieldIncrementTrigger,
  NumberFieldInput,
  NumberFieldLabel,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressLabel,
  ProgressValueLabel,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemLabel,
  ReportDashboardGrid,
  ReportDateRangeControl,
  ReportDrilldownLayout,
  ReportHeader,
  ReportToolbar,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarAccount,
  SidebarFooter,
  SidebarHeader,
  SidebarMain,
  SidebarNav,
  SidebarNavItem,
  SimpleEmptyState,
  Skeleton,
  Slider,
  SliderFill,
  SliderLabel,
  SliderThumb,
  SliderTrack,
  SliderValueLabel,
  StatusBadge,
  SchemaForm,
  SwitchPreset,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
  Toaster,
  Toolbar,
  ToolbarFilterButtons,
  ToolbarGroup,
  ToolbarIconButton,
  ToolbarSearch,
  ToolbarSpacer,
  ToolbarSurface,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  toast,
} from "@xgx/ui";

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

const primarySections = [
  { id: "foundations", label: "Foundations", icon: Layers },
  { id: "shell", label: "Shell", icon: LayoutDashboard },
  { id: "ai", label: "AI Workspace", icon: Bot },
  { id: "auth", label: "Auth & Access", icon: LockKeyhole },
  { id: "controls", label: "Controls", icon: SlidersHorizontal },
  { id: "navigation", label: "Navigation", icon: PanelLeft },
  { id: "admin", label: "Administration", icon: Users },
  { id: "forms", label: "Forms", icon: ClipboardCheck },
  { id: "data", label: "Data", icon: Table2 },
  { id: "reporting", label: "Reporting", icon: ChartColumn },
  { id: "workflows", label: "Workflows", icon: ListChecks },
  { id: "overlays", label: "Overlays", icon: Columns3 },
  { id: "feedback", label: "Feedback", icon: Bell },
  { id: "async", label: "Async Runtime", icon: RefreshCw },
  { id: "advanced", label: "Advanced", icon: Wand2 },
  { id: "coverage", label: "Coverage", icon: Database },
] as const;

const utilitySections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const sections = [...primarySections, ...utilitySections] as const;

type SectionId = (typeof sections)[number]["id"];
type ThemeMode = keyof typeof themeTokens;

const sectionDescriptions: Record<SectionId, string> = {
  foundations: "Token contracts, state pairs, and usage rules.",
  shell: "A compact application frame for operational workflows.",
  ai: "AI command surfaces, review states, sources, guardrails, and audit trails.",
  auth: "Access, identity, session, and permission states.",
  controls: "Icon actions, toggles, segmented controls, and interaction states.",
  navigation: "Rail navigation and section-level routing states.",
  admin: "Users, roles, integrations, audit logs, and enterprise controls.",
  forms: "Inputs, validation, numeric controls, choice fields, and sliders.",
  data: "Search, saved views, tables, filters, and bulk actions.",
  reporting: "Metrics, charts, dashboards, and report drill-downs.",
  workflows: "List-to-detail flows, approvals, review queues, and task progress.",
  overlays: "Dialogs, dropdown menus, toast actions, and elevated surfaces.",
  feedback: "Status, callouts, loading, empty states, and progress.",
  async: "Async portals, deferred options, optimistic actions, and fallbacks.",
  advanced: "Calendar, document preview, rich text, file drop, and drag/drop.",
  coverage: "Component coverage, workflow coverage, and remaining gaps.",
  profile: "Account presence, session activity, access scope, and personal settings.",
  settings: "Workspace preferences, notification routing, security, and data controls.",
};

const records = [
  {
    id: "REQ-1042",
    name: "Access review",
    owner: "Operations",
    status: "Ready",
    risk: "Low",
    updated: "09:15",
  },
  {
    id: "REQ-1043",
    name: "Policy exception",
    owner: "Compliance",
    status: "Review",
    risk: "Medium",
    updated: "10:05",
  },
  {
    id: "REQ-1044",
    name: "Vendor intake",
    owner: "Procurement",
    status: "Blocked",
    risk: "High",
    updated: "11:20",
  },
];

const tasks = [
  { label: "Validate request", done: true },
  { label: "Assign reviewer", done: true },
  { label: "Collect evidence", done: false },
  { label: "Approve decision", done: false },
];

const asyncReviewers = [
  { id: "ops", name: "Operations review", role: "Primary queue" },
  { id: "risk", name: "Risk review", role: "Escalation queue" },
  { id: "legal", name: "Legal review", role: "Policy queue" },
] as const;

type AsyncReviewer = (typeof asyncReviewers)[number];

type AsyncQueueItem = {
  id: string;
  label: string;
  state: "queued" | "pending" | "committed";
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const coverageRows = [
  ["Shell", "Sidebar, topbar, page header, toolbar, detail panel", "Live"],
  ["AI Workspace", "Prompt region, AI answer, sources, confidence, review queue", "Live"],
  ["Auth & Access", "Sign in, MFA, reset, denied, session, workspace states", "Live"],
  ["Administration", "Users, roles, integrations, audit, compliance controls", "Live"],
  ["Controls", "Buttons, icon buttons, toggles, segmented controls", "Live"],
  ["Forms", "Text, textarea, number, slider, radio, checkbox, switch", "Live"],
  ["Data", "Data grid, filters, saved views, bulk actions", "Live"],
  ["Reporting", "Metrics, chart panels, dashboards, drill-down reports", "Live"],
  ["Overlays", "Dialog, dropdown, toast region", "Live"],
  ["Feedback", "Badges, callouts, errors, empty, loading, progress", "Live"],
  ["Async Runtime", "Async portals, deferred selects, optimistic state, fallbacks", "Live"],
  ["Advanced", "Calendar, document preview, rich text, dropzone", "Live"],
  ["Profile", "Account popover, profile page, sessions, access scope", "Live"],
  ["Settings", "Settings popover, preferences, notifications, security", "Live"],
] as const;

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

  createMountEffect(() => {
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

function FoundationsPanel() {
  return (
    <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Token Contract</CardTitle>
          <CardDescription>Raw values map into paired interaction states.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <TokenSwatch label="Background" class="bg-background text-foreground" />
          <TokenSwatch label="Surface" class="bg-surface text-surface-foreground" />
          <TokenSwatch label="Primary" class="bg-primary text-primary-foreground" />
          <TokenSwatch label="Hover" class="bg-hover text-hover-foreground" />
          <TokenSwatch label="Selected" class="bg-selected text-selected-foreground" />
          <TokenSwatch label="Success" class="bg-success text-success-foreground" />
          <TokenSwatch label="Warning" class="bg-warning text-warning-foreground" />
          <TokenSwatch label="Error" class="bg-error text-error-foreground" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Pattern</CardTitle>
          <CardDescription>Catalog examples import from the package root.</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeSample
            code={`import {
  AppShell,
  Sidebar,
  ToolbarSurface,
  ToolbarIconButton,
} from "@xgx/ui";`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ShellPanel() {
  return (
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Application Chrome</CardTitle>
          <CardDescription>
            Command region, toolbar, segmented status, and detail context.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <CommandRegion class="bg-surface-raised">
            <ToolbarSearch value="" onInput={() => undefined} placeholder="Search records" />
            <ToolbarSpacer />
            <ToolbarSurface>
              <ToolbarIconButton aria-label="Refresh">
                <RefreshCw />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Filter" pressed>
                <Filter />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="More">
                <MoreHorizontal />
              </ToolbarIconButton>
            </ToolbarSurface>
          </CommandRegion>
          <Toolbar class="rounded-md border border-border-subtle bg-surface px-3 py-2">
            <ToolbarGroup class="min-w-0">
              <Badge variant="outline">Queue</Badge>
              <StatusBadge variant="success" dotColor="success">
                Connected
              </StatusBadge>
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarFilterButtons
              value="open"
              onChange={() => undefined}
              options={[
                { id: "open", label: "Open" },
                { id: "queued", label: "Queued" },
                { id: "closed", label: "Closed" },
              ]}
            />
          </Toolbar>
        </CardContent>
      </Card>

      <DetailPanel class="overflow-hidden">
        <DetailSidebar
          isSlim={false}
          onToggle={() => undefined}
          header={{
            initials: "RQ",
            displayName: "Record profile",
            subtitle: <span class="text-xs text-muted-foreground">Review lane</span>,
            badges: [{ label: "Active", variant: "success" }],
          }}
          sections={[
            {
              title: "Summary",
              rows: [
                { label: "Owner", value: "Operations" },
                { label: "Status", value: "Review" },
                { label: "Priority", value: "Medium" },
              ],
            },
            {
              title: "Audit",
              rows: [
                { label: "Created", value: "Today" },
                { label: "Updated", value: "11:20" },
              ],
            },
          ]}
          slimIcons={[{ icon: <Bell class="size-4" /> }]}
        />
      </DetailPanel>
    </div>
  );
}

function AiWorkspacePanel() {
  const [mode, setMode] = createSignal("assist");
  const [prompt, setPrompt] = createSignal(
    "Summarise blocked records and suggest the next owner action.",
  );
  const [reviewRequired, setReviewRequired] = createSignal(true);

  const modeDescription = createMemo(() => {
    if (mode() === "review") return "Review generated decisions before action.";
    if (mode() === "automate") return "Draft safe automation with approval gates.";
    return "Ask, inspect, cite sources, and keep humans in control.";
  });

  return (
    <div class="space-y-4">
      <CommandRegion>
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles class="size-4" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">AI workspace</div>
            <div class="truncate text-xs text-muted-foreground">{modeDescription()}</div>
          </div>
        </div>
        <ToolbarFilterButtons
          value={mode()}
          onChange={setMode}
          options={[
            { id: "assist", label: "Assist" },
            { id: "review", label: "Review" },
            { id: "automate", label: "Automate" },
          ]}
        />
      </CommandRegion>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>AI Command Region</CardTitle>
            <CardDescription>
              Prompting, context, citations, and approval state in one workflow.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <TextField>
              <TextFieldLabel>Prompt</TextFieldLabel>
              <TextFieldTextArea
                value={prompt()}
                onInput={(event) => setPrompt(event.currentTarget.value)}
                class="min-h-28"
              />
            </TextField>

            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Draft a decision summary with citations.")}
              >
                <MessageSquare />
                Draft summary
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Find risks in the selected records.")}
              >
                <MessageSquareWarning />
                Risk scan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Create a guarded follow-up workflow.")}
              >
                <Workflow />
                Build workflow
              </Button>
            </div>

            <div class="rounded-lg border border-border-subtle bg-surface p-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <div class="flex size-8 items-center justify-center rounded-md bg-info/14 text-info-foreground">
                    <Bot class="size-4" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold">Generated answer</div>
                    <div class="text-xs text-muted-foreground">
                      Grounded in selected records and policy context.
                    </div>
                  </div>
                </div>
                <StatusBadge
                  variant={reviewRequired() ? "warning" : "success"}
                  dotColor={reviewRequired() ? "warning" : "success"}
                >
                  {reviewRequired() ? "Needs review" : "Approved"}
                </StatusBadge>
              </div>

              <div class="space-y-3 text-sm leading-6">
                <p>
                  Two records need owner follow-up. The highest-risk item is blocked by missing
                  evidence, while the review item is waiting on policy approval.
                </p>
                <div class="grid gap-2 sm:grid-cols-3">
                  <AiSignal label="Confidence" value="86%" tone="success" />
                  <AiSignal label="Sources" value="4" tone="info" />
                  <AiSignal label="Actions" value="2" tone="warning" />
                </div>
              </div>

              <div class="mt-4 grid gap-2">
                <AiSourceRow title="REQ-1044" detail="Blocked vendor intake record" />
                <AiSourceRow title="Policy control" detail="Evidence required before approval" />
                <AiSourceRow title="Audit trail" detail="Last reviewer update at 11:20" />
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => setReviewRequired(false)}>
                  <CheckCircle2 />
                  Approve answer
                </Button>
                <Button type="button" variant="outline">
                  <ClipboardCheck />
                  Create tasks
                </Button>
                <Button type="button" variant="outline">
                  <Archive />
                  Save to audit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Guardrails</CardTitle>
              <CardDescription>Trust, policy, and human control states.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <GuardrailRow icon={<Shield />} label="Policy check" value="Passed" tone="success" />
              <GuardrailRow icon={<BrainCircuit />} label="Model" value="Reasoning" tone="info" />
              <GuardrailRow icon={<Cpu />} label="Tool access" value="Limited" tone="warning" />
              <SwitchPreset
                defaultChecked={reviewRequired()}
                label="Require approval before action"
                onChange={setReviewRequired}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tool Trace</CardTitle>
              <CardDescription>Visible AI execution history.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <TraceRow step="Context loaded" detail="3 records, 2 policies" />
              <TraceRow step="Risk scored" detail="Blocked item promoted" />
              <TraceRow step="Citations attached" detail="4 source references" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminPanel(props: { goToSection: (section: SectionId) => void }) {
  return (
    <div class="space-y-4">
      <CommandRegion>
        <ToolbarSearch
          value=""
          onInput={() => undefined}
          placeholder="Search users, roles, integrations"
        />
        <ToolbarSpacer />
        <ToolbarFilterButtons
          value="active"
          onChange={() => undefined}
          options={[
            { id: "active", label: "Active" },
            { id: "review", label: "Review" },
            { id: "disabled", label: "Disabled" },
          ]}
        />
        <Button type="button">
          <Plus />
          Invite user
        </Button>
      </CommandRegion>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader class="border-b border-border-subtle">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Users And Roles</CardTitle>
                <CardDescription>Access management with status and scope.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm">
                <Users />
                Manage roles
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-4">
            <DataGrid
              class="min-h-[260px]"
              items={[
                { user: "Verified User", role: "Admin", status: "Active", scope: "All workspaces" },
                { user: "Reviewer", role: "Approver", status: "Review", scope: "Operations" },
                { user: "Auditor", role: "Read only", status: "Active", scope: "Audit logs" },
              ]}
              columns={[
                {
                  key: "user",
                  label: "User",
                  width: "col-span-4",
                  render: (row) => (
                    <DataGridCell>
                      <UserRound class="size-4 text-muted-foreground" />
                      <DataGridText>{row.user}</DataGridText>
                    </DataGridCell>
                  ),
                },
                { key: "role", label: "Role", width: "col-span-3" },
                {
                  key: "status",
                  label: "Status",
                  width: "col-span-2",
                  render: (row) => (
                    <StatusBadge
                      variant={row.status === "Review" ? "warning" : "success"}
                      dotColor={row.status === "Review" ? "warning" : "success"}
                    >
                      {row.status}
                    </StatusBadge>
                  ),
                },
                { key: "scope", label: "Scope", width: "col-span-3" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enterprise Controls</CardTitle>
            <CardDescription>Operational readiness checklist.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <GuardrailRow icon={<ShieldCheck />} label="SSO" value="Enforced" tone="success" />
            <GuardrailRow icon={<Database />} label="Retention" value="365 days" tone="info" />
            <GuardrailRow icon={<Bell />} label="Escalations" value="Enabled" tone="success" />
            <Button
              type="button"
              variant="outline"
              class="w-full justify-start"
              onClick={() => props.goToSection("settings")}
            >
              <Settings />
              Open settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connected systems and operational status.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3 md:grid-cols-2">
            <IntegrationRow name="Identity provider" status="Connected" />
            <IntegrationRow name="Data warehouse" status="Connected" />
            <IntegrationRow name="Ticketing system" status="Action needed" warning />
            <IntegrationRow name="Notification relay" status="Connected" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Every privileged action is reviewable.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <TraceRow step="Role updated" detail="Reviewer changed to Approver" />
            <TraceRow step="Policy exported" detail="Audit report generated" />
            <TraceRow step="AI answer approved" detail="Saved with citations" />
            <TraceRow step="Integration checked" detail="Ticketing sync warning" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AiSignal(props: { label: string; value: string; tone: "success" | "warning" | "info" }) {
  const toneClass = () =>
    props.tone === "success"
      ? "bg-success/12 text-success-foreground"
      : props.tone === "warning"
        ? "bg-warning/14 text-warning-foreground"
        : "bg-info/14 text-info-foreground";

  return (
    <div class={`rounded-md px-3 py-2 ${toneClass()}`}>
      <div class="text-xs font-medium opacity-80">{props.label}</div>
      <div class="mt-1 text-sm font-semibold">{props.value}</div>
    </div>
  );
}

function AiSourceRow(props: { title: string; detail: string }) {
  return (
    <div class="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-muted px-3 py-2">
      <FileText class="size-4 text-muted-foreground" />
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{props.title}</div>
        <div class="truncate text-xs text-muted-foreground">{props.detail}</div>
      </div>
    </div>
  );
}

function GuardrailRow(props: {
  icon: JSX.Element;
  label: string;
  value: string;
  tone: "success" | "warning" | "info";
}) {
  const toneClass = () =>
    props.tone === "success"
      ? "bg-success/12 text-success-foreground"
      : props.tone === "warning"
        ? "bg-warning/14 text-warning-foreground"
        : "bg-info/14 text-info-foreground";

  return (
    <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class={`flex size-8 items-center justify-center rounded-md ${toneClass()}`}>
          {props.icon}
        </div>
        <span class="truncate text-sm font-medium">{props.label}</span>
      </div>
      <span class="text-xs font-semibold text-muted-foreground">{props.value}</span>
    </div>
  );
}

function TraceRow(props: { step: string; detail: string }) {
  return (
    <div class="rounded-md border border-border-subtle bg-surface p-3">
      <div class="flex items-center gap-2">
        <CheckCircle2 class="size-4 text-success" />
        <span class="text-sm font-medium">{props.step}</span>
      </div>
      <div class="mt-1 text-xs text-muted-foreground">{props.detail}</div>
    </div>
  );
}

function IntegrationRow(props: { name: string; status: string; warning?: boolean }) {
  return (
    <div class="rounded-md border border-border-subtle bg-surface p-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-8 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
            <PlugZap class="size-4" />
          </div>
          <div class="truncate text-sm font-medium">{props.name}</div>
        </div>
        <StatusBadge
          variant={props.warning ? "warning" : "success"}
          dotColor={props.warning ? "warning" : "success"}
        >
          {props.status}
        </StatusBadge>
      </div>
    </div>
  );
}

function AccountAvatar(props: {
  initials: string;
  status?: "online" | "away" | "busy" | "offline";
  class?: string;
}) {
  const statusClass = () =>
    props.status === "away"
      ? "bg-warning-foreground"
      : props.status === "busy"
        ? "bg-error-foreground"
        : props.status === "offline"
          ? "bg-muted-foreground"
          : "bg-success-foreground";

  return (
    <div
      class={`relative flex size-8 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-[10px] font-semibold uppercase text-sidebar-accent-foreground ${props.class ?? ""}`}
      aria-hidden="true"
    >
      {props.initials}
      <span
        class={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-popover ${statusClass()}`}
      />
    </div>
  );
}

function AccountPopoverContent(props: { goToSection: (section: SectionId) => void }) {
  return (
    <div class="overflow-hidden rounded-md bg-popover text-popover-foreground">
      <div class="flex items-start justify-between gap-3 border-b border-border-subtle p-4">
        <div class="flex min-w-0 items-center gap-3">
          <AccountAvatar initials="VU" status="online" class="shrink-0" />
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">Verified User</div>
            <div class="truncate text-xs text-muted-foreground">verified.user@example.com</div>
          </div>
        </div>
        <PopoverClose class="rounded-md p-1 text-muted-foreground hover:bg-hover hover:text-hover-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <X class="size-4" />
          <span class="sr-only">Close account menu</span>
        </PopoverClose>
      </div>

      <div class="grid gap-2 p-3">
        <div class="rounded-md border border-success/35 bg-success/12 p-3 text-success-foreground">
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs font-semibold uppercase">Session</span>
            <StatusBadge variant="success" dotColor="success">
              Online
            </StatusBadge>
          </div>
          <p class="mt-2 text-xs text-success-foreground/80">
            Signed in with verified access. Session refresh is active.
          </p>
        </div>

        <div class="grid gap-1">
          <Button
            type="button"
            variant="ghost"
            class="justify-start"
            onClick={() => props.goToSection("profile")}
          >
            <UserRound />
            View profile
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="justify-start"
            onClick={() => props.goToSection("settings")}
          >
            <Settings />
            Account settings
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="justify-start"
            onClick={() => props.goToSection("auth")}
          >
            <LockKeyhole />
            Access flows
          </Button>
        </div>
      </div>

      <div class="border-t border-border-subtle p-3">
        <Button type="button" variant="outline" class="w-full justify-start">
          <ArrowRight />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function SettingsPopoverContent(props: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  goToSection: (section: SectionId) => void;
}) {
  return (
    <div class="overflow-hidden rounded-md bg-popover text-popover-foreground">
      <div class="flex items-start justify-between gap-3 border-b border-border-subtle p-4">
        <div>
          <div class="text-sm font-semibold">Settings</div>
          <div class="mt-1 text-xs text-muted-foreground">
            Quick preferences for this workspace.
          </div>
        </div>
        <PopoverClose class="rounded-md p-1 text-muted-foreground hover:bg-hover hover:text-hover-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <X class="size-4" />
          <span class="sr-only">Close settings menu</span>
        </PopoverClose>
      </div>

      <div class="space-y-3 p-3">
        <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
          <div>
            <div class="text-xs font-semibold uppercase text-muted-foreground">Appearance</div>
            <div class="mt-1 text-sm font-medium">
              {props.theme === "dark" ? "Dark" : "Light"} mode
            </div>
          </div>
          <ToolbarSurface aria-label="Quick theme">
            <ToolbarIconButton
              aria-label="Light theme"
              pressed={props.theme === "light"}
              onClick={() => props.setTheme("light")}
            >
              <Sun />
            </ToolbarIconButton>
            <ToolbarIconButton
              aria-label="Dark theme"
              pressed={props.theme === "dark"}
              onClick={() => props.setTheme("dark")}
            >
              <Moon />
            </ToolbarIconButton>
          </ToolbarSurface>
        </div>

        <SwitchPreset defaultChecked label="Desktop notifications" />
        <SwitchPreset defaultChecked label="Compact workspace" />
        <SwitchPreset label="Security prompts" />
      </div>

      <div class="border-t border-border-subtle p-3">
        <Button
          type="button"
          class="w-full justify-start"
          onClick={() => props.goToSection("settings")}
        >
          <Settings />
          Open settings
        </Button>
      </div>
    </div>
  );
}

function ProfilePanel(props: { goToSection: (section: SectionId) => void }) {
  return (
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader class="border-b border-border-subtle">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
              <AccountAvatar initials="VU" status="online" class="size-12 text-sm" />
              <div class="min-w-0">
                <CardTitle>Verified User</CardTitle>
                <CardDescription>verified.user@example.com</CardDescription>
                <div class="mt-2 flex flex-wrap gap-2">
                  <StatusBadge variant="success" dotColor="success">
                    Online
                  </StatusBadge>
                  <Badge variant="outline">Workspace admin</Badge>
                  <Badge variant="outline">MFA enabled</Badge>
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => props.goToSection("settings")}>
              <Settings />
              Edit settings
            </Button>
          </div>
        </CardHeader>
        <CardContent class="grid gap-4 p-4 md:grid-cols-3">
          <ProfileMetric label="Role" value="Administrator" />
          <ProfileMetric label="Last sign-in" value="09:42" />
          <ProfileMetric label="Access level" value="Full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Health</CardTitle>
          <CardDescription>Identity and security readiness.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <HealthRow icon={<ShieldCheck />} label="MFA" value="Enabled" tone="success" />
          <HealthRow icon={<KeyRound />} label="Recovery" value="Configured" tone="success" />
          <HealthRow icon={<Bell />} label="Alerts" value="3 active" tone="warning" />
        </CardContent>
      </Card>

      <Card class="xl:col-span-2">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Current and recent account activity.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <SessionRow
            device="Current browser"
            location="Verified workspace"
            time="Active now"
            status="Current"
          />
          <SessionRow
            device="Desktop app"
            location="Known device"
            time="Today, 08:10"
            status="Trusted"
          />
          <SessionRow
            device="Mobile browser"
            location="Known device"
            time="Yesterday, 17:24"
            status="Trusted"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Scope</CardTitle>
          <CardDescription>Permissions visible to the current user.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <AccessScopeRow label="Records" value="Read and write" />
          <AccessScopeRow label="Reporting" value="Export allowed" />
          <AccessScopeRow label="Administration" value="Manage users" />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel(props: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  goToSection: (section: SectionId) => void;
}) {
  return (
    <div class="space-y-4">
      <CommandRegion>
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Settings class="size-4" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">Workspace settings</div>
            <div class="truncate text-xs text-muted-foreground">
              Preferences, security, notifications, and data controls.
            </div>
          </div>
        </div>
        <ToolbarSurface aria-label="Settings theme">
          <ToolbarIconButton
            aria-label="Light theme"
            pressed={props.theme === "light"}
            onClick={() => props.setTheme("light")}
          >
            <Sun />
          </ToolbarIconButton>
          <ToolbarIconButton
            aria-label="Dark theme"
            pressed={props.theme === "dark"}
            onClick={() => props.setTheme("dark")}
          >
            <Moon />
          </ToolbarIconButton>
        </ToolbarSurface>
      </CommandRegion>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Local interface settings for dense workflows.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 md:grid-cols-2">
            <SettingRow
              title="Compact density"
              description="Use tighter rows, controls, and card spacing."
              enabled
            />
            <SettingRow
              title="Persistent filters"
              description="Remember active filters between sessions."
              enabled
            />
            <SettingRow
              title="Preview panel"
              description="Open record details beside high-volume lists."
              enabled
            />
            <SettingRow
              title="Reduced motion"
              description="Keep transitions minimal across overlays."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Account and session safeguards.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <HealthRow icon={<ShieldCheck />} label="MFA" value="Required" tone="success" />
            <HealthRow icon={<LockKeyhole />} label="Session timeout" value="30 min" tone="info" />
            <HealthRow icon={<KeyRound />} label="Recovery codes" value="Unused" tone="success" />
            <Button
              type="button"
              variant="outline"
              class="w-full justify-start"
              onClick={() => props.goToSection("auth")}
            >
              <LockKeyhole />
              Review access flows
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Route important events without noise.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <NotificationRow label="Assignment changes" channel="In-app and email" />
            <NotificationRow label="Approval requests" channel="In-app, email, and digest" />
            <NotificationRow label="Blocked records" channel="Immediate alert" />
            <NotificationRow label="Weekly summaries" channel="Digest only" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Controls</CardTitle>
            <CardDescription>Export, retention, and audit preferences.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="rounded-md border border-border-subtle bg-surface p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">Audit export</div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    Generate a portable activity report.
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm">
                  <Download />
                  Export
                </Button>
              </div>
            </div>
            <div class="rounded-md border border-border-subtle bg-surface p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium">Import defaults</div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    Apply a saved settings profile.
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm">
                  <Upload />
                  Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileMetric(props: { label: string; value: string }) {
  return (
    <div class="rounded-md border border-border-subtle bg-surface p-3">
      <div class="text-xs font-medium text-muted-foreground">{props.label}</div>
      <div class="mt-1 text-sm font-semibold">{props.value}</div>
    </div>
  );
}

function HealthRow(props: {
  icon: JSX.Element;
  label: string;
  value: string;
  tone: "success" | "warning" | "info";
}) {
  const toneClass = () =>
    props.tone === "success"
      ? "bg-success/12 text-success-foreground"
      : props.tone === "warning"
        ? "bg-warning/14 text-warning-foreground"
        : "bg-info/14 text-info-foreground";

  return (
    <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class={`flex size-8 items-center justify-center rounded-md ${toneClass()}`}>
          {props.icon}
        </div>
        <span class="truncate text-sm font-medium">{props.label}</span>
      </div>
      <span class="text-xs font-semibold text-muted-foreground">{props.value}</span>
    </div>
  );
}

function SessionRow(props: { device: string; location: string; time: string; status: string }) {
  return (
    <div class="grid gap-3 rounded-md border border-border-subtle bg-surface p-3 sm:grid-cols-[1fr_140px_auto] sm:items-center">
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{props.device}</div>
        <div class="mt-1 truncate text-xs text-muted-foreground">{props.location}</div>
      </div>
      <div class="text-xs text-muted-foreground">{props.time}</div>
      <StatusBadge variant="success" dotColor="success">
        {props.status}
      </StatusBadge>
    </div>
  );
}

function AccessScopeRow(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
      <span class="text-sm font-medium">{props.label}</span>
      <span class="text-xs text-muted-foreground">{props.value}</span>
    </div>
  );
}

function SettingRow(props: { title: string; description: string; enabled?: boolean }) {
  return (
    <div class="rounded-md border border-border-subtle bg-surface p-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium">{props.title}</div>
          <div class="mt-1 text-xs text-muted-foreground">{props.description}</div>
        </div>
        <SwitchPreset defaultChecked={props.enabled} label="" />
      </div>
    </div>
  );
}

function NotificationRow(props: { label: string; channel: string }) {
  return (
    <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{props.label}</div>
        <div class="mt-1 truncate text-xs text-muted-foreground">{props.channel}</div>
      </div>
      <SwitchPreset defaultChecked label="" />
    </div>
  );
}

type AuthView = "signin" | "mfa" | "reset" | "denied";

function AuthAccessPanel() {
  const [authView, setAuthView] = createSignal<AuthView>("signin");
  const authViews: Array<{ id: AuthView; label: string }> = [
    { id: "signin", label: "Sign in" },
    { id: "mfa", label: "MFA" },
    { id: "reset", label: "Reset" },
    { id: "denied", label: "Denied" },
  ];

  return (
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="rounded-lg border border-border-subtle bg-surface p-3 text-surface-foreground">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold">Auth Screen Preview</h3>
            <p class="text-xs text-muted-foreground">
              Generic access flows without provider or tenant branding.
            </p>
          </div>
          <ToolbarFilterButtons value={authView()} onChange={setAuthView} options={authViews} />
        </div>

        <AuthPage class="min-h-[560px] rounded-md border border-border-subtle bg-surface-muted">
          <AuthCard class="max-w-[420px]">
            <Show when={authView() === "signin"}>
              <div class="space-y-5">
                <div class="space-y-2 text-center">
                  <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <LockKeyhole class="size-5" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold">Secure access</h2>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Use your organization credentials to continue.
                    </p>
                  </div>
                </div>
                <div class="space-y-3">
                  <TextField>
                    <TextFieldLabel>Email</TextFieldLabel>
                    <div class="relative">
                      <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <TextFieldInput type="email" class="pl-9" placeholder="name@company.com" />
                    </div>
                  </TextField>
                  <TextField>
                    <TextFieldLabel>Password</TextFieldLabel>
                    <div class="relative">
                      <KeyRound class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <TextFieldInput type="password" class="pl-9" placeholder="Password" />
                    </div>
                  </TextField>
                </div>
                <div class="space-y-2">
                  <Button type="button" class="w-full">
                    Continue
                    <ArrowRight />
                  </Button>
                  <Button type="button" variant="outline" class="w-full">
                    <ShieldCheck />
                    Single sign-on
                  </Button>
                </div>
              </div>
            </Show>

            <Show when={authView() === "mfa"}>
              <div class="space-y-5">
                <div class="space-y-2 text-center">
                  <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ShieldCheck class="size-5" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold">Verify sign in</h2>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Enter the code from your authenticator app.
                    </p>
                  </div>
                </div>
                <div class="grid grid-cols-6 gap-2">
                  <For each={["4", "8", "", "", "", ""]}>
                    {(value, index) => (
                      <TextField>
                        <TextFieldInput
                          aria-label={`Code digit ${index() + 1}`}
                          inputmode="numeric"
                          maxlength={1}
                          value={value}
                          class="h-11 bg-surface px-0 text-center text-base font-semibold"
                        />
                      </TextField>
                    )}
                  </For>
                </div>
                <div class="rounded-md border border-border-subtle bg-surface-muted p-3 text-xs text-muted-foreground">
                  Backup codes and recovery prompts use the same layout density.
                </div>
                <Button type="button" class="w-full">
                  Verify
                  <ArrowRight />
                </Button>
              </div>
            </Show>

            <Show when={authView() === "reset"}>
              <div class="space-y-5">
                <div class="space-y-2 text-center">
                  <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <KeyRound class="size-5" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold">Reset access</h2>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Send a secure recovery link to a verified address.
                    </p>
                  </div>
                </div>
                <TextField>
                  <TextFieldLabel>Email address</TextFieldLabel>
                  <TextFieldInput type="email" placeholder="name@company.com" />
                  <TextFieldDescription>Recovery copy stays provider-neutral.</TextFieldDescription>
                </TextField>
                <Button type="button" class="w-full">
                  Send reset link
                  <ArrowRight />
                </Button>
              </div>
            </Show>

            <Show when={authView() === "denied"}>
              <div class="space-y-5">
                <div class="space-y-2 text-center">
                  <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-error text-error-foreground">
                    <AlertTriangle class="size-5" />
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold">Access needed</h2>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Your account does not have permission for this workspace.
                    </p>
                  </div>
                </div>
                <Callout variant="error">
                  <CalloutTitle>Permission denied</CalloutTitle>
                  <CalloutContent>
                    Request a role change or switch to an authorized workspace.
                  </CalloutContent>
                </Callout>
                <div class="grid gap-2 sm:grid-cols-2">
                  <Button type="button">Request access</Button>
                  <Button type="button" variant="outline">
                    Switch workspace
                  </Button>
                </div>
              </div>
            </Show>
          </AuthCard>
        </AuthPage>
      </section>

      <div class="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Access States</CardTitle>
            <CardDescription>Enterprise auth needs explicit non-happy paths.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <For
              each={[
                ["Session expired", "Re-authenticate without losing context"],
                ["Locked account", "Explain recovery and support path"],
                ["Invite pending", "Show acceptance and setup state"],
                ["Role upgrade", "Request elevated access safely"],
              ]}
            >
              {(row) => (
                <div class="rounded-md border border-border-subtle bg-surface p-3">
                  <div class="text-sm font-medium">{row[0]}</div>
                  <div class="mt-1 text-xs text-muted-foreground">{row[1]}</div>
                </div>
              )}
            </For>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Context</CardTitle>
            <CardDescription>Account presence and workspace scope.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
              <div class="flex min-w-0 items-center gap-3">
                <SidebarAccount
                  initials="VU"
                  status="online"
                  title="Verified user"
                  class="shrink-0"
                />
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">Sidebar presence</div>
                  <div class="truncate text-xs text-muted-foreground">
                    Same primitive as the rail footer
                  </div>
                </div>
              </div>
              <StatusBadge variant="success" dotColor="success">
                Online
              </StatusBadge>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex size-8 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                  <UserRound class="size-4" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">Current account</div>
                  <div class="truncate text-xs text-muted-foreground">
                    verified-user@example.com
                  </div>
                </div>
              </div>
              <StatusBadge variant="success" dotColor="success">
                Active
              </StatusBadge>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface p-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex size-8 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                  <Database class="size-4" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">Workspace</div>
                  <div class="truncate text-xs text-muted-foreground">Operational environment</div>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm">
                Switch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ControlsPanel() {
  return (
    <div class="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card>
        <CardHeader>
          <CardTitle>Toolbar Actions</CardTitle>
          <CardDescription>Icon-only controls with explicit state and shape rules.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface-muted p-3">
            <ToolbarSurface class="bg-surface">
              <ToolbarIconButton aria-label="Search">
                <Search />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Preview">
                <Eye />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Filter" pressed>
                <Filter />
              </ToolbarIconButton>
            </ToolbarSurface>
            <ToolbarSurface class="bg-surface">
              <ToolbarIconButton aria-label="Panel">
                <PanelLeft />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Archive">
                <Archive />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="Refresh">
                <RefreshCw />
              </ToolbarIconButton>
              <ToolbarIconButton aria-label="More actions">
                <MoreHorizontal />
              </ToolbarIconButton>
            </ToolbarSurface>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Default</span>
              <IconButton aria-label="Default">
                <Search />
              </IconButton>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Surface</span>
              <IconButton aria-label="Surface" variant="surface">
                <Eye />
              </IconButton>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Pressed</span>
              <IconButton aria-label="Pressed" variant="surface" pressed>
                <Check />
              </IconButton>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Loading</span>
              <IconButton aria-label="Loading" loading />
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Disabled</span>
              <IconButton aria-label="Disabled" disabled>
                <Settings />
              </IconButton>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
              <span class="text-xs font-medium text-muted-foreground">Danger</span>
              <IconButton aria-label="Danger" variant="danger">
                <X />
              </IconButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segmented Controls</CardTitle>
          <CardDescription>View and mode selection for dense toolbars.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 rounded-md border border-border-subtle bg-surface-muted p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium">View mode</p>
                <p class="text-xs text-muted-foreground">Switch layout without moving context.</p>
              </div>
              <ToolbarToggleGroup defaultValue="table" aria-label="View mode">
                <ToolbarToggleItem value="table" aria-label="Table">
                  <Table2 />
                </ToolbarToggleItem>
                <ToolbarToggleItem value="cards" aria-label="Cards">
                  <Layers />
                </ToolbarToggleItem>
                <ToolbarToggleItem value="activity" aria-label="Activity">
                  <Activity />
                </ToolbarToggleItem>
              </ToolbarToggleGroup>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
              <div>
                <p class="text-sm font-medium">Density</p>
                <p class="text-xs text-muted-foreground">Compact defaults for high-volume pages.</p>
              </div>
              <ToolbarToggleGroup defaultValue="compact" aria-label="Density" size="sm">
                <ToolbarToggleItem value="compact">Compact</ToolbarToggleItem>
                <ToolbarToggleItem value="comfortable">Comfortable</ToolbarToggleItem>
              </ToolbarToggleGroup>
            </div>
          </div>

          <Tabs
            defaultValue="density"
            class="rounded-md border border-border-subtle bg-surface p-3"
          >
            <TabsList aria-label="Control states">
              <TabsTrigger value="density">Density</TabsTrigger>
              <TabsTrigger value="states">States</TabsTrigger>
            </TabsList>
            <TabsContent value="density" class="mt-3 text-xs text-muted-foreground">
              Compact spacing keeps repeated workflows scannable.
            </TabsContent>
            <TabsContent value="states" class="mt-3 text-xs text-muted-foreground">
              Active, disabled, hover, and focus-visible states share one token contract.
            </TabsContent>
          </Tabs>

          <div class="rounded-md border border-border-subtle bg-surface p-3">
            <div class="grid gap-2.5">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-medium">Queue preview</span>
                <StatusBadge variant="success" dotColor="success">
                  Ready
                </StatusBadge>
              </div>
              <div class="grid gap-1.5">
                <div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-xs">
                  <span class="truncate text-muted-foreground">Compact operational row</span>
                  <span class="font-medium">09:15</span>
                </div>
                <div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-xs">
                  <span class="truncate text-muted-foreground">Selected control state</span>
                  <span class="font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NavigationPanel(props: { section: SectionId; goToSection: (section: SectionId) => void }) {
  return (
    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Sidebar States</CardTitle>
          <CardDescription>Rail item states for icon-only navigation.</CardDescription>
        </CardHeader>
        <CardContent class="flex gap-2">
          <SidebarNavItem as="button" type="button" title="Inactive">
            <Eye class="size-4" />
          </SidebarNavItem>
          <SidebarNavItem as="button" type="button" active title="Active">
            <Check class="size-4" />
          </SidebarNavItem>
          <SidebarNavItem as="button" type="button" shape="circle" title="Circle">
            <Bell class="size-4" />
          </SidebarNavItem>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section Navigation</CardTitle>
          <CardDescription>Section links for app-level navigation.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <For each={primarySections}>
            {(item) => {
              const Icon = item.icon;
              return (
                <Button
                  variant={props.section === item.id ? "default" : "outline"}
                  onClick={() => props.goToSection(item.id)}
                  class="justify-start"
                >
                  <Icon />
                  {item.label}
                </Button>
              );
            }}
          </For>
        </CardContent>
      </Card>
    </div>
  );
}

function FormsPanel() {
  const [reviewerEmail, setReviewerEmail] = createSignal("missing-domain");
  const generatedForm = createForm(
    z.object({
      title: z.string().min(3).describe("Request title").meta({ placeholder: "Access review" }),
      ownerEmail: z
        .string()
        .email()
        .describe("Owner email")
        .meta({ placeholder: "owner@example.com", inputMode: "email" }),
      priority: z.enum(["standard", "expedite", "blocked"]).describe("Priority"),
      reviewers: z.number().min(1).max(12).default(2).describe("Reviewer count").meta({ step: 1 }),
      tags: z.array(z.string().min(2).describe("Tag")).describe("Tags"),
      notify: z.boolean().describe("Notify on submit"),
    }),
    {
      initialValues: {
        priority: "standard",
        tags: ["policy", "access"],
      },
    },
  );

  return (
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inputs And Validation</CardTitle>
          <CardDescription>Labels, helper text, error text, disabled state.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <TextField>
            <TextFieldLabel>Request name</TextFieldLabel>
            <TextFieldInput placeholder="Operational review" />
            <TextFieldDescription>Use concise names that scan well in tables.</TextFieldDescription>
          </TextField>
          <TextField validationState="invalid">
            <TextFieldLabel>Reviewer email</TextFieldLabel>
            <TextFieldInput
              type="email"
              value={reviewerEmail()}
              onInput={(event) => setReviewerEmail(event.currentTarget.value)}
            />
            <TextFieldErrorMessage>Enter a valid reviewer email.</TextFieldErrorMessage>
          </TextField>
          <TextField>
            <TextFieldLabel>Decision notes</TextFieldLabel>
            <TextFieldTextArea placeholder="Summarise the decision context" />
          </TextField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Controls</CardTitle>
          <CardDescription>Numeric, range, radio, checkbox, and switch.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <NumberField defaultValue={3} minValue={0} maxValue={10} class="w-40">
            <NumberFieldLabel>Reviewers</NumberFieldLabel>
            <NumberFieldGroup>
              <NumberFieldInput />
              <NumberFieldIncrementTrigger />
              <NumberFieldDecrementTrigger />
            </NumberFieldGroup>
          </NumberField>
          <Slider defaultValue={[62]} class="w-full">
            <div class="mb-2 flex justify-between">
              <SliderLabel>Confidence</SliderLabel>
              <SliderValueLabel />
            </div>
            <SliderTrack>
              <SliderFill />
              <SliderThumb />
            </SliderTrack>
          </Slider>
          <RadioGroup defaultValue="standard">
            <RadioGroupItem value="standard">
              <RadioGroupItemLabel>Standard approval</RadioGroupItemLabel>
            </RadioGroupItem>
            <RadioGroupItem value="exception">
              <RadioGroupItemLabel>Exception path</RadioGroupItemLabel>
            </RadioGroupItem>
          </RadioGroup>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked />
              Required evidence
            </label>
            <SwitchPreset defaultChecked label="Notify assignee" />
            <SwitchPreset disabled label="Locked" />
          </div>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>Schema Form</CardTitle>
          <CardDescription>
            Generated fields backed by the same input, select, number, checkbox, and badge
            primitives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaForm
            form={generatedForm}
            onSubmit={() => undefined}
            class="grid gap-4 md:grid-cols-2"
          >
            <generatedForm.Field name="title" />
            <generatedForm.Field name="ownerEmail" />
            <generatedForm.Field name="priority" />
            <generatedForm.Field name="reviewers" />
            <div class="md:col-span-2">
              <generatedForm.Field name="tags" />
            </div>
            <generatedForm.Field name="notify" />
            <div class="flex items-center gap-2 md:col-span-2">
              <Button type="submit" size="sm">
                Validate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generatedForm.reset()}
              >
                Reset
              </Button>
              <span class="text-xs text-muted-foreground">
                {generatedForm.isDirty() ? "Unsaved changes" : "No changes"}
              </span>
            </div>
          </SchemaForm>
        </CardContent>
      </Card>
    </div>
  );
}

function DataPanel(props: {
  records: typeof records;
  savedView: string;
  search: string;
  setSavedView: (value: string) => void;
  setSearch: (value: string) => void;
  setSelectedRecord: (record: (typeof records)[number]) => void;
}) {
  return (
    <div class="space-y-4">
      <CommandRegion>
        <ToolbarSearch
          value={props.search}
          onInput={props.setSearch}
          placeholder="Filter records"
        />
        <ToolbarSpacer />
        <ToolbarFilterButtons
          value={props.savedView}
          onChange={props.setSavedView}
          options={[
            { id: "all", label: "All" },
            { id: "review", label: "Review" },
            { id: "blocked", label: "Blocked" },
          ]}
        />
        <Button variant="outline">
          <Plus />
          Saved view
        </Button>
      </CommandRegion>

      <Card>
        <CardHeader class="border-b border-border-subtle">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <CardTitle>Filtered Data Grid</CardTitle>
              <CardDescription>Rows, status chips, saved views, and bulk actions.</CardDescription>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Assign
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-4">
          <DataGrid
            class="min-h-[260px]"
            items={props.records}
            onRowClick={props.setSelectedRecord}
            emptyContent={
              <SimpleEmptyState
                icon={<FolderOpen />}
                title="No records match"
                description="Adjust filters or clear the search term."
                action={<Button variant="outline">Reset filters</Button>}
              />
            }
            columns={[
              {
                key: "id",
                label: "Record",
                width: "col-span-3",
                render: (record) => (
                  <DataGridCell>
                    <FileText class="size-4 text-muted-foreground" />
                    <div class="min-w-0">
                      <DataGridText>{record.id}</DataGridText>
                      <DataGridText muted>{record.name}</DataGridText>
                    </div>
                  </DataGridCell>
                ),
              },
              { key: "owner", label: "Owner", width: "col-span-3" },
              {
                key: "status",
                label: "Status",
                width: "col-span-2",
                render: (record) => (
                  <StatusBadge
                    variant={
                      record.status === "Blocked"
                        ? "error"
                        : record.status === "Review"
                          ? "warning"
                          : "success"
                    }
                    dotColor={
                      record.status === "Blocked"
                        ? "error"
                        : record.status === "Review"
                          ? "warning"
                          : "success"
                    }
                  >
                    {record.status}
                  </StatusBadge>
                ),
              },
              { key: "risk", label: "Risk", width: "col-span-2" },
              { key: "updated", label: "Updated", width: "col-span-2" },
            ]}
          />
        </CardContent>
        <CardFooter class="border-t border-border-subtle pt-3">
          <span class="xgx-text-body text-muted-foreground">
            {props.records.length} visible records
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

const reportRows = [
  {
    id: "REP-201",
    segment: "Automation",
    owner: "Operations",
    status: "Healthy",
    value: "94.2%",
    change: "+6.1%",
  },
  {
    id: "REP-202",
    segment: "Exceptions",
    owner: "Compliance",
    status: "Review",
    value: "18",
    change: "-3.4%",
  },
  {
    id: "REP-203",
    segment: "Cycle time",
    owner: "Delivery",
    status: "Healthy",
    value: "2.8d",
    change: "+11.8%",
  },
  {
    id: "REP-204",
    segment: "Backlog",
    owner: "Operations",
    status: "Attention",
    value: "42",
    change: "+4.7%",
  },
];

const reportLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const reportRanges = ["7d", "30d", "90d"] as const;
type ReportRange = (typeof reportRanges)[number];

function normalizeReportRange(value: unknown): ReportRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return reportRanges.includes(candidate as ReportRange) ? (candidate as ReportRange) : "30d";
}

function colorToken(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function ReportingPanel(props: { theme: ThemeMode }) {
  const [range, setRange] = createSignal<ReportRange>("30d");
  const [view, setView] = createSignal("overview");
  const [segment, setSegment] = createSignal("Automation");
  const selectedRange = () => normalizeReportRange(range());

  const rangeScale = createMemo(() =>
    selectedRange() === "7d" ? 0.42 : selectedRange() === "90d" ? 2.4 : 1,
  );

  const palette = createMemo(() => {
    props.theme;
    return {
      axis: colorToken("--color-chart-axis", "oklch(0.52 0.026 255)"),
      grid: colorToken("--color-chart-grid", "oklch(0.9 0.01 250)"),
      one: colorToken("--color-chart-1", "oklch(0.43 0.075 250)"),
      two: colorToken("--color-chart-2", "oklch(0.56 0.105 235)"),
      three: colorToken("--color-chart-3", "oklch(0.58 0.09 150)"),
      four: colorToken("--color-chart-4", "oklch(0.72 0.11 75)"),
      five: colorToken("--color-chart-5", "oklch(0.62 0.14 28)"),
    };
  });

  const chartOptions = createMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    color: palette().axis,
    scales: {
      x: {
        stacked: false,
        border: { display: false },
        grid: { display: false },
        ticks: { color: palette().axis },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: palette().grid },
        ticks: { color: palette().axis, precision: 0 },
      },
    },
    plugins: {
      legend: {
        display: true,
        align: "end" as const,
        labels: {
          boxHeight: 7,
          boxWidth: 7,
          color: palette().axis,
          usePointStyle: true,
        },
      },
    },
  }));

  const stackedOptions = createMemo(() => ({
    ...chartOptions(),
    scales: {
      x: {
        stacked: true,
        border: { display: false },
        grid: { display: false },
        ticks: { color: palette().axis },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        border: { display: false },
        grid: { color: palette().grid },
        ticks: { color: palette().axis, precision: 0 },
      },
    },
  }));

  const lineData = createMemo(() => ({
    labels: reportLabels,
    datasets: [
      {
        label: "Completed",
        data: [18, 24, 21, 31, 35, 29, 42].map((value) => Math.round(value * rangeScale())),
        borderColor: palette().one,
        backgroundColor: palette().one,
        tension: 0.35,
      },
      {
        label: "Queued",
        data: [12, 15, 18, 16, 20, 19, 24].map((value) => Math.round(value * rangeScale())),
        borderColor: palette().two,
        backgroundColor: palette().two,
        tension: 0.35,
      },
    ],
  }));

  const barData = createMemo(() => ({
    labels: ["North", "South", "East", "West"],
    datasets: [
      {
        label: "Standard",
        data: [42, 36, 48, 31].map((value) => Math.round(value * rangeScale())),
        backgroundColor: palette().one,
        borderColor: palette().one,
      },
      {
        label: "Exception",
        data: [12, 9, 16, 11].map((value) => Math.round(value * rangeScale())),
        backgroundColor: palette().four,
        borderColor: palette().four,
      },
    ],
  }));

  const areaData = createMemo(() => ({
    labels: reportLabels,
    datasets: [
      {
        label: "Throughput",
        data: [20, 26, 24, 35, 39, 33, 46].map((value) => Math.round(value * rangeScale())),
        borderColor: palette().three,
        backgroundColor: palette().three,
        fill: true,
        tension: 0.4,
      },
    ],
  }));

  const donutData = createMemo(() => ({
    labels: ["On track", "Review", "Blocked"],
    datasets: [
      {
        data: [68, 22, 10],
        backgroundColor: [palette().three, palette().four, palette().five],
        borderColor: [
          colorToken("--color-card", "white"),
          colorToken("--color-card", "white"),
          colorToken("--color-card", "white"),
        ],
        borderWidth: 3,
      },
    ],
  }));

  const visibleReportRows = createMemo(() =>
    reportRows.filter((row) => {
      if (view() === "attention") return row.status !== "Healthy";
      if (view() === "selected") return row.segment === segment();
      return true;
    }),
  );

  return (
    <div class="space-y-4">
      <ReportHeader
        eyebrow="Reporting"
        title="Operational Reporting"
        description="Metrics, dashboard charts, saved report views, and drill-down analysis."
        meta={`Current range: ${selectedRange().toUpperCase()}`}
        actions={
          <>
            <Button type="button" variant="outline">
              <Share2 />
              Share
            </Button>
            <Button type="button" variant="outline">
              <Download />
              Export
            </Button>
          </>
        }
      />

      <ReportToolbar>
        <ReportDateRangeControl
          value={selectedRange()}
          onChange={(next) => {
            setRange(normalizeReportRange(next));
          }}
        />
        <ToolbarSpacer />
        <ToolbarFilterButtons
          value={view()}
          onChange={setView}
          options={[
            { id: "overview", label: "Overview" },
            { id: "attention", label: "Needs attention" },
            { id: "selected", label: "Selected segment" },
          ]}
        />
      </ReportToolbar>

      <MetricGrid>
        <MetricCard
          label="Completion rate"
          value="94.2%"
          trend="+6.1%"
          trendDirection="up"
          trendTone="positive"
          description="vs previous period"
          icon={<TrendingUp class="size-4" />}
        />
        <MetricCard
          label="Open exceptions"
          value="18"
          trend="-3.4%"
          trendDirection="down"
          trendTone="positive"
          description="fewer escalations"
          icon={<AlertTriangle class="size-4" />}
        />
        <MetricCard
          label="Cycle time"
          value="2.8d"
          trend="+11.8%"
          trendDirection="up"
          trendTone="negative"
          description="median duration"
          icon={<CalendarRange class="size-4" />}
        />
        <MetricCard
          label="Export queue"
          value="7"
          trend="stable"
          trendDirection="flat"
          trendTone="neutral"
          description="ready to download"
          icon={<FileDown class="size-4" />}
        />
      </MetricGrid>

      <ReportDashboardGrid>
        <ChartPanel
          class="xl:col-span-7"
          title="Trend Overview"
          description="Line chart with tokenized series colors."
          height="22rem"
          summary="Completed work is trending above queued work for the selected date range."
        >
          <LineChart data={lineData()} options={chartOptions()} />
        </ChartPanel>
        <ChartPanel
          class="xl:col-span-5"
          title="Status Mix"
          description="Donut chart for high-level distribution."
          height="22rem"
          summary="Most work is on track, with review and blocked states separated."
        >
          <DonutChart
            data={donutData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              color: palette().axis,
              plugins: {
                legend: {
                  display: true,
                  position: "bottom" as const,
                  labels: {
                    color: palette().axis,
                    usePointStyle: true,
                  },
                },
              },
            }}
          />
        </ChartPanel>
        <ChartPanel
          class="xl:col-span-6"
          title="Stacked Workload"
          description="Grouped categories with stacked comparison."
          height="19rem"
          summary="Standard and exception work can be compared by region."
        >
          <BarChart data={barData()} options={stackedOptions()} />
        </ChartPanel>
        <ChartPanel
          class="xl:col-span-6"
          title="Throughput Area"
          description="Area chart for volume over time."
          height="19rem"
          summary="Throughput increases toward the end of the period."
        >
          <LineChart data={areaData()} options={chartOptions()} />
        </ChartPanel>
      </ReportDashboardGrid>

      <div class="grid gap-4 lg:grid-cols-3">
        <ChartPanel
          state="loading"
          title="Loading State"
          description="Skeleton state for report queries."
          height="11rem"
        />
        <ChartPanel
          state="empty"
          title="Empty State"
          description="No matching data after filters."
          height="11rem"
        />
        <ChartPanel
          state="error"
          title="Error State"
          description="Retry path for failed report fetches."
          height="11rem"
        />
      </div>

      <ReportDrilldownLayout>
        <Card>
          <CardHeader class="border-b border-border-subtle">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Drill-down Report</CardTitle>
                <CardDescription>
                  Filtered table synced to the selected report segment.
                </CardDescription>
              </div>
              <div class="flex flex-wrap gap-2">
                {["Automation", "Exceptions", "Cycle time", "Backlog"].map((item) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={segment() === item ? "default" : "outline"}
                    onClick={() => {
                      setSegment(item);
                      setView("selected");
                    }}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent class="p-4">
            <DataGrid
              items={visibleReportRows()}
              class="min-h-[240px]"
              columns={[
                { key: "id", label: "Report", width: "col-span-2" },
                { key: "segment", label: "Segment", width: "col-span-3" },
                { key: "owner", label: "Owner", width: "col-span-3" },
                {
                  key: "status",
                  label: "Status",
                  width: "col-span-2",
                  render: (row) => (
                    <StatusBadge
                      variant={row.status === "Healthy" ? "success" : "warning"}
                      dotColor={row.status === "Healthy" ? "success" : "warning"}
                    >
                      {row.status}
                    </StatusBadge>
                  ),
                },
                { key: "value", label: "Value", width: "col-span-1" },
                { key: "change", label: "Change", width: "col-span-1" },
              ]}
            />
          </CardContent>
        </Card>

        <DetailPanel class="overflow-hidden">
          <div class="space-y-4 p-4">
            <div class="space-y-1">
              <div class="text-xs font-medium uppercase text-muted-foreground">
                Selected Segment
              </div>
              <h3 class="text-lg font-semibold">{segment()}</h3>
              <p class="text-sm text-muted-foreground">
                Segment selection updates the saved view and report table.
              </p>
            </div>
            <div class="grid gap-2">
              <div class="rounded-md border border-border-subtle bg-surface p-3">
                <div class="text-xs text-muted-foreground">Comparison period</div>
                <div class="mt-1 text-sm font-medium">{selectedRange().toUpperCase()}</div>
              </div>
              <div class="rounded-md border border-border-subtle bg-surface p-3">
                <div class="text-xs text-muted-foreground">Visible rows</div>
                <div class="mt-1 text-sm font-medium">{visibleReportRows().length}</div>
              </div>
              <div class="rounded-md border border-border-subtle bg-surface p-3">
                <div class="text-xs text-muted-foreground">Export format</div>
                <div class="mt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm">
                    CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DetailPanel>
      </ReportDrilldownLayout>
    </div>
  );
}

function WorkflowsPanel(props: {
  progress: number;
  setProgress: (value: number) => void;
  selectedRecord: (typeof records)[number];
}) {
  return (
    <div class="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
          <CardDescription>List-to-detail CRUD, review state, task queue.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-3">
            <For each={tasks}>
              {(task, index) => (
                <div class="flex items-center gap-3 rounded-md border border-border-subtle bg-surface p-3">
                  <StatusBadge
                    variant={task.done ? "success" : "outline"}
                    dotColor={task.done ? "success" : "default"}
                  >
                    Step {index() + 1}
                  </StatusBadge>
                  <span class="text-sm">{task.label}</span>
                </div>
              )}
            </For>
          </div>
          <div class="space-y-4">
            <Progress value={props.progress}>
              <div class="mb-2 flex justify-between">
                <ProgressLabel>Workflow progress</ProgressLabel>
                <ProgressValueLabel />
              </div>
            </Progress>
            <div class="flex gap-2">
              <Button
                variant="outline"
                onClick={() => props.setProgress(Math.max(0, props.progress - 10))}
              >
                Decrease
              </Button>
              <Button onClick={() => props.setProgress(Math.min(100, props.progress + 10))}>
                Increase
              </Button>
            </div>
            <Callout>
              <CalloutTitle>Selected record</CalloutTitle>
              <CalloutContent>
                {props.selectedRecord.id} is owned by {props.selectedRecord.owner}.
              </CalloutContent>
            </Callout>
          </div>
        </CardContent>
      </Card>

      <DetailPanel class="p-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Detail Sidebar</h2>
            <StatusBadge
              variant={
                props.selectedRecord.status === "Blocked"
                  ? "error"
                  : props.selectedRecord.status === "Review"
                    ? "warning"
                    : "success"
              }
              dotColor={
                props.selectedRecord.status === "Blocked"
                  ? "error"
                  : props.selectedRecord.status === "Review"
                    ? "warning"
                    : "success"
              }
            >
              {props.selectedRecord.status}
            </StatusBadge>
          </div>
          <DetailSidebar
            isSlim={false}
            onToggle={() => undefined}
            header={{
              initials: props.selectedRecord.id.slice(-2),
              displayName: props.selectedRecord.name,
              subtitle: (
                <span class="text-xs text-muted-foreground">{props.selectedRecord.owner}</span>
              ),
            }}
            sections={[
              {
                title: "Record",
                rows: [
                  { label: "Id", value: props.selectedRecord.id },
                  { label: "Risk", value: props.selectedRecord.risk },
                  { label: "Updated", value: props.selectedRecord.updated },
                ],
              },
            ]}
          />
        </div>
      </DetailPanel>
    </div>
  );
}

function OverlaysPanel() {
  const [dialogOpen, setDialogOpen] = createSignal(false);

  return (
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dialogs And Menus</CardTitle>
          <CardDescription>Focus management, menu content, and actions.</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)}>
            <Columns3 />
            Open dialog
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input px-3 text-xs hover:bg-hover hover:text-hover-foreground">
              <MoreHorizontal class="size-4" />
              Menu
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Assign owner</DropdownMenuItem>
              <DropdownMenuItem>Duplicate record</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
            <DialogContent class="w-full max-w-md">
              <DialogHeader>
                <DialogTitle>Review decision</DialogTitle>
                <DialogDescription>
                  Confirm the decision and keep the audit trail visible.
                </DialogDescription>
              </DialogHeader>
              <Callout variant="warning">
                <CalloutTitle>Pending evidence</CalloutTitle>
                <CalloutContent>One required attachment is still missing.</CalloutContent>
              </Callout>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Continue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toast Actions</CardTitle>
          <CardDescription>Notifications use tokenized raised surfaces.</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.info("Queued", "Task added")}>
            <Info />
            Info
          </Button>
          <Button onClick={() => toast.success("Approved", "Workflow completed")}>
            <CheckCircle2 />
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning("Review", "Evidence is incomplete")}
          >
            <AlertTriangle />
            Warning
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type AsyncSummary = {
  detail: string;
  run: number;
  status: string;
};

function AsyncSummarySlot(props: { summary: () => AsyncSummary }) {
  const summary = () => props.summary();

  return (
    <div
      data-testid="async-summary-ready"
      class="rounded-md border border-border-subtle bg-surface-muted px-3 py-2"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium text-foreground">{summary().status}</span>
        <Badge variant="default">Run {summary().run}</Badge>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">{summary().detail}</p>
    </div>
  );
}

function AsyncRuntimePanel() {
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [popoverOpen, setPopoverOpen] = createSignal(false);
  const [portalBusy, setPortalBusy] = createSignal(false);
  const [portalStatus, setPortalStatus] = createSignal("Idle");
  const [reviewers, setReviewers] = createSignal<AsyncReviewer[]>([]);
  const [reviewer, setReviewer] = createSignal<AsyncReviewer | null>(null);
  const [selectLoading, setSelectLoading] = createSignal(false);
  const [summaryRun, setSummaryRun] = createSignal(1);
  const [actionBusy, setActionBusy] = createSignal(false);
  const [queue, setQueue] = createOptimistic<AsyncQueueItem[]>([
    { id: "baseline", label: "Baseline approval", state: "committed" },
  ]);

  const summary = createMemo<AsyncSummary>(async () => {
    const run = summaryRun();
    await wait(500);
    return {
      detail: "Deferred summary resolved without replacing the surrounding page chrome.",
      run,
      status: "Async summary ready",
    };
  });

  const commitQueueItem = action(function* () {
    const id = `optimistic-${Date.now()}`;
    setQueue((items) => [{ id, label: "Async approval", state: "pending" }, ...items]);
    yield wait(650);
    setQueue((items) =>
      items.map((item) => (item.id === id ? { ...item, state: "committed" } : item)),
    );
  });

  const openAsyncDialog = async () => {
    setPortalBusy(true);
    setPortalStatus("Checking access before opening portal");
    await wait(450);
    setPortalStatus("Access check complete");
    setDialogOpen(true);
    setPortalBusy(false);
  };

  const openAsyncPopover = async () => {
    setPortalBusy(true);
    setPortalStatus("Loading popover context");
    await wait(350);
    setPortalStatus("Popover context loaded");
    setPopoverOpen(true);
    setPortalBusy(false);
  };

  const loadReviewerOptions = async () => {
    setSelectLoading(true);
    setReviewers([]);
    setReviewer(null);
    await wait(600);
    setReviewers([...asyncReviewers]);
    setReviewer(asyncReviewers[0]);
    setSelectLoading(false);
  };

  const runOptimisticAction = async () => {
    setActionBusy(true);
    try {
      await commitQueueItem();
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Async Portal Triggers</CardTitle>
          <CardDescription>
            Dialog and popover open after awaited work without losing state.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Button
              data-testid="async-dialog-trigger"
              disabled={portalBusy()}
              onClick={openAsyncDialog}
            >
              <Columns3 />
              Open dialog after async
            </Button>
            <Popover open={popoverOpen()} onOpenChange={setPopoverOpen}>
              <PopoverTrigger
                data-testid="async-popover-trigger"
                class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-foreground hover:bg-hover hover:text-hover-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={(event) => {
                  event.preventDefault();
                  void openAsyncPopover();
                }}
              >
                <Info class="size-4" />
                Async popover
              </PopoverTrigger>
              <PopoverContent data-testid="async-popover-content" class="w-72">
                <div class="space-y-2">
                  <p class="text-sm font-medium text-foreground">Loaded context</p>
                  <p class="text-xs text-muted-foreground">
                    Popover state was opened by an awaited event handler.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div class="rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
            {portalBusy() ? "Async operation running" : portalStatus()}
          </div>
          <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
            <DialogContent data-testid="async-dialog-content" class="w-full max-w-md">
              <DialogHeader>
                <DialogTitle>Async portal opened</DialogTitle>
                <DialogDescription>
                  This modal was mounted through a real portal after awaited work.
                </DialogDescription>
              </DialogHeader>
              <Callout>
                <CalloutTitle>{portalStatus()}</CalloutTitle>
                <CalloutContent>
                  Portal content should stay interactive and close cleanly.
                </CalloutContent>
              </Callout>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deferred Select Options</CardTitle>
          <CardDescription>
            Options load later while the select exposes a clear fallback state.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <Button
              data-testid="async-select-load"
              variant="outline"
              disabled={selectLoading()}
              onClick={loadReviewerOptions}
            >
              <RefreshCw class={selectLoading() ? "animate-spin" : undefined} />
              Load options
            </Button>
            <Badge variant={reviewer() ? "success" : "secondary"}>
              {reviewer() ? "Ready" : selectLoading() ? "Loading" : "Empty"}
            </Badge>
          </div>
          <Select<AsyncReviewer>
            options={reviewers()}
            value={reviewer()}
            optionValue="id"
            optionTextValue="name"
            optionLabel={(option) => `${option.name} ${option.role}`}
            onChange={(value) => setReviewer(value as AsyncReviewer)}
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>
                <div class="min-w-0">
                  <div class="truncate font-medium">{itemProps.item.rawValue.name}</div>
                  <div class="truncate text-muted-foreground">{itemProps.item.rawValue.role}</div>
                </div>
              </SelectItem>
            )}
          >
            <SelectTrigger data-testid="async-select-trigger" class="h-9">
              <SelectValue<AsyncReviewer>>
                {(state) =>
                  state.selectedOption()?.name ??
                  (selectLoading() ? "Loading reviewers" : "Select reviewer")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent data-testid="async-select-content" class="w-full min-w-72">
              <Show when={selectLoading()}>
                <div
                  data-testid="async-select-fallback"
                  class="border-t border-border-subtle px-3 py-2 text-xs text-muted-foreground"
                >
                  Loading reviewer options
                </div>
              </Show>
              <Show when={!selectLoading() && reviewers().length === 0}>
                <div class="border-t border-border-subtle px-3 py-2 text-xs text-muted-foreground">
                  Load options to populate this select.
                </div>
              </Show>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Boundaries</CardTitle>
          <CardDescription>
            Async reads should replace only the data slot, not the full layout.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button
            data-testid="async-summary-refresh"
            variant="outline"
            onClick={() => setSummaryRun((run) => run + 1)}
          >
            <RefreshCw />
            Refresh summary
          </Button>
          <Loading
            on={summaryRun()}
            fallback={
              <div
                data-testid="async-summary-fallback"
                class="space-y-2 rounded-md border border-border-subtle bg-surface-muted p-3"
              >
                <Skeleton animate class="h-4 w-32 rounded" />
                <Skeleton animate class="h-4 w-3/4 rounded" />
              </div>
            }
          >
            <AsyncSummarySlot summary={summary} />
          </Loading>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimistic Action</CardTitle>
          <CardDescription>
            Pending rows appear immediately, then settle after async work.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button
            data-testid="async-optimistic-trigger"
            disabled={actionBusy()}
            onClick={runOptimisticAction}
          >
            <CheckCircle2 />
            Add approval
          </Button>
          <div class="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle">
            <For each={queue()}>
              {(item) => (
                <div
                  data-testid={`async-queue-${item.state}`}
                  class="flex items-center justify-between gap-3 bg-card px-3 py-2"
                >
                  <span class="text-sm text-foreground">{item.label}</span>
                  <StatusBadge
                    variant={item.state === "committed" ? "success" : "warning"}
                    dotColor={item.state === "committed" ? "success" : "warning"}
                  >
                    {item.state === "committed" ? "Committed" : "Pending"}
                  </StatusBadge>
                </div>
              )}
            </For>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackPanel(props: { progress: number; setProgress: (value: number) => void }) {
  return (
    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status And Errors</CardTitle>
          <CardDescription>Badges, callouts, error, empty, loading.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="info">Info</Badge>
            <StatusBadge variant="success" dotColor="success">
              Ready
            </StatusBadge>
            <StatusBadge variant="warning" dotColor="warning">
              Review
            </StatusBadge>
          </div>
          <Callout variant="success">
            <CalloutTitle>Saved</CalloutTitle>
            <CalloutContent>State styling follows the active token set.</CalloutContent>
          </Callout>
          <ErrorAlert message="Validation blocked this submission." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loading And Empty</CardTitle>
          <CardDescription>Progress, skeleton, empty-state composition.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Progress value={props.progress}>
            <div class="mb-2 flex justify-between">
              <ProgressLabel>Completion</ProgressLabel>
              <ProgressValueLabel />
            </div>
          </Progress>
          <div class="space-y-2">
            <Skeleton animate class="h-4 w-2/3 rounded" />
            <Skeleton animate class="h-4 w-1/2 rounded" />
            <Skeleton animate class="h-20 rounded-md" />
          </div>
          <SimpleEmptyState
            icon={<FolderOpen />}
            title="No queued work"
            description="The empty state stays neutral and action-led."
            action={<Button variant="outline">Create item</Button>}
            padding="sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AdvancedPanel(props: {
  richText: string;
  setRichText: (value: string) => void;
  droppedFiles: string;
  setDroppedFiles: (value: string) => void;
}) {
  const day = new Date();
  const events = [
    {
      id: "calendar-1",
      title: "Triage",
      startDate: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0),
      endDate: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0),
    },
    {
      id: "calendar-2",
      title: "Approval",
      startDate: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 13, 0),
      endDate: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 14, 0),
      isCompleted: true,
    },
  ];

  return (
    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Operational scheduling with tokenized chrome.</CardDescription>
        </CardHeader>
        <CardContent class="h-[420px]">
          <Calendar
            events={events}
            defaultViewMode="day"
            defaultDate={day}
            startHour={8}
            endHour={18}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rich Text And Drag/Drop</CardTitle>
          <CardDescription>Editing and upload surfaces for review workflows.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <RichTextEditor
            value={props.richText}
            onChange={props.setRichText}
            minHeight="130px"
            placeholder="Add review notes"
          />
          <FileDropzone
            accept={[".pdf", "image/*"]}
            maxFiles={3}
            onFileDrop={(files) => props.setDroppedFiles(files.map((file) => file.name).join(", "))}
          >
            {({ state }) => (
              <div
                class={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-md p-5 text-center ${
                  state().isOver ? "bg-control-muted text-control-muted-foreground" : "bg-surface"
                }`}
              >
                <Upload class="size-6 text-muted-foreground" />
                <div class="text-sm font-medium">Drop evidence files</div>
                <div class="text-xs text-muted-foreground">{props.droppedFiles}</div>
              </div>
            )}
          </FileDropzone>
        </CardContent>
      </Card>

      <Card class="xl:col-span-2">
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
          <CardDescription>Compact document review frame.</CardDescription>
        </CardHeader>
        <CardContent class="overflow-auto">
          <div class="origin-top-left scale-[0.55] sm:scale-75 lg:scale-90">
            <DocumentPreviewShell>
              <DocumentPreviewHeader
                documentLabel="Operational record"
                documentNumberLabel="Reference"
                documentNumber="DOC-1004"
              />
              <DocumentPreviewStatusBar statusLabel="Draft">
                <Badge variant="warning">Review required</Badge>
              </DocumentPreviewStatusBar>
              <div class="grid grid-cols-2 gap-8 p-10">
                <DocumentPreviewParty title="Prepared by" name="Operations team">
                  <span>Queue owner</span>
                  <span>Review group</span>
                </DocumentPreviewParty>
                <DocumentPreviewParty title="Reviewed by" name="Compliance team">
                  <span>Policy owner</span>
                  <span>Decision approver</span>
                </DocumentPreviewParty>
              </div>
            </DocumentPreviewShell>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoveragePanel() {
  return (
    <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Component Coverage</CardTitle>
          <CardDescription>Exported components represented in the catalog.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <For each={coverageRows}>
            {(row) => (
              <div class="grid grid-cols-[150px_1fr_auto] items-center gap-3 rounded-md border border-border-subtle bg-surface p-3 text-sm">
                <span class="font-medium">{row[0]}</span>
                <span class="text-muted-foreground">{row[1]}</span>
                <Badge variant="success">{row[2]}</Badge>
              </div>
            )}
          </For>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remaining Hardening</CardTitle>
          <CardDescription>Tracked in docs for systematic follow-up.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3 text-sm text-muted-foreground">
          <p>Broaden visual regression coverage across every exported component.</p>
          <p>Add keyboard interaction tests for data, overlay, and editor workflows.</p>
          <p>Continue tokenizing legacy specialized components not shown here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TokenSwatch(props: { label: string; class: string }) {
  return (
    <div
      class={`rounded-md border p-4 ${props.class}`}
      style={{ "border-color": "color-mix(in oklch, currentColor 22%, transparent)" }}
    >
      <div class="text-sm font-medium">{props.label}</div>
      <div class="mt-1 text-xs">foreground/background pair</div>
    </div>
  );
}

function CodeSample(props: { code: string }) {
  return (
    <pre class="overflow-auto rounded-md border border-border-subtle bg-surface-muted p-3 text-xs text-surface-foreground">
      <code>{props.code}</code>
    </pre>
  );
}
