import {
  Bell,
  Bot,
  ChartColumn,
  ClipboardCheck,
  Columns3,
  Database,
  GripVertical,
  Layers,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  PanelLeft,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Table2,
  UserRound,
  Users,
  Wand2,
} from "@xgx/ui/icons";
import { z } from "zod";

export const primarySections = [
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
  { id: "dnd", label: "Drag And Drop", icon: GripVertical },
  { id: "coverage", label: "Coverage", icon: Database },
] as const;

export const utilitySections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export const sections = [...primarySections, ...utilitySections] as const;

export type SectionId = (typeof sections)[number]["id"];
export type ThemeMode = "light" | "dark";

export const sectionDescriptions: Record<SectionId, string> = {
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
  advanced: "Calendar, document preview, rich text, and file drop.",
  dnd: "Sortable lists, handles, grouped movement, and store-backed order.",
  coverage: "Component coverage, workflow coverage, and remaining gaps.",
  profile: "Account presence, session activity, access scope, and personal settings.",
  settings: "Workspace preferences, notification routing, security, and data controls.",
};

export const records = [
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

export type DemoRecord = (typeof records)[number];

export const tasks = [
  { label: "Validate request", done: true },
  { label: "Assign reviewer", done: true },
  { label: "Collect evidence", done: false },
  { label: "Approve decision", done: false },
];

export const asyncReviewers = [
  { id: "ops", name: "Operations review", role: "Primary queue" },
  { id: "risk", name: "Risk review", role: "Escalation queue" },
  { id: "legal", name: "Legal review", role: "Policy queue" },
] as const;

export type AsyncReviewer = (typeof asyncReviewers)[number];

export const responseDialogQueues = [
  {
    value: "ops",
    label: "Operations review",
    detail: "Primary route for standard access changes.",
  },
  {
    value: "risk",
    label: "Risk review",
    detail: "Escalates changes with policy or control impact.",
  },
  {
    value: "legal",
    label: "Legal review",
    detail: "Routes contractual and regulatory exceptions.",
  },
] as const;

export type ResponseDialogQueue = (typeof responseDialogQueues)[number];

export const responseDialogFormSchema = z.object({
  title: z.string().min(3).describe("Request title").meta({ placeholder: "Access review" }),
  queue: z.string().min(1).describe("Review queue"),
  summary: z
    .string()
    .min(8)
    .describe("Decision summary")
    .meta({ placeholder: "Summarise the routing decision", rows: 3 }),
});

export type ResponseDialogFormValues = z.output<typeof responseDialogFormSchema>;

export type AsyncQueueItem = {
  id: string;
  label: string;
  state: "queued" | "pending" | "committed";
};

export const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const coverageRows = [
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
