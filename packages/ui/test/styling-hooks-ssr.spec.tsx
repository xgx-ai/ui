import { renderToString } from "@solidjs/web";
import { NotificationActionButton, NotificationItem } from "../src/data-display/notification-item";
import { SidebarRow } from "../src/data-display/sidebar-section";
import { DetailSidebar } from "../src/detail-sidebar/detail-sidebar";
import { Badge } from "../src/feedback/badge";
import { Select, SelectValue } from "../src/forms/select";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../src/layout/tabs";
import { TableColumnHeader } from "../src/table-compat";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export default function runStylingHooksSsrSpec() {
  const tabs = renderToString(() => (
    <Tabs value="one" variant="segmented">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
        <TabsIndicator />
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
    </Tabs>
  ));
  for (const slot of ["tabs", "tabs-list", "tabs-trigger", "tabs-content", "tabs-indicator"]) {
    assert(
      new RegExp(`data-slot="${slot}"[^>]*data-tabs-variant="segmented"`).test(tabs),
      `Tabs omitted the app styling hook for ${slot}`,
    );
  }
  assert(tabs.includes('aria-selected="true"'), "Variant changes must preserve selected semantics");
  assert(tabs.includes("bg-surface-muted"), "Segmented tabs must render their muted track");
  assert(!tabs.includes("border-b border-border-subtle"), "Segmented tabs must drop the underline");
  const defaultTabs = renderToString(() => (
    <Tabs>
      <TabsList />
    </Tabs>
  ));
  assert(
    defaultTabs.includes('data-tabs-variant="underline"'),
    "Tabs must expose its default variant",
  );
  assert(
    defaultTabs.includes("border-b border-border-subtle"),
    "The default underline tab styles must stay unchanged",
  );

  const empty = renderToString(() => (
    <Select options={["One"]} value={null} placeholder="Choose an option">
      <SelectValue />
    </Select>
  ));
  assert(empty.includes("data-placeholder-shown"), "Empty selections must mark the placeholder");
  assert(empty.includes(">Choose an option<"), "Empty selections must render the placeholder");
  const custom = renderToString(() => (
    <Select options={["One"]} value={null} placeholder="Choose an option">
      <SelectValue>{(state) => state.selectedOption()?.toString() ?? "Own fallback"}</SelectValue>
    </Select>
  ));
  assert(custom.includes("Own fallback"), "Custom empty-selection rendering must stay intact");
  assert(!custom.includes("Choose an option"), "A custom fallback replaces the placeholder");
  const selected = renderToString(() => (
    <Select options={[0]} value={0} placeholder="Choose an option">
      <SelectValue />
    </Select>
  ));
  assert(!selected.includes("data-placeholder-shown"), "A selected zero must not appear empty");
  assert(selected.includes(">0<"), "A selected zero must render its value");

  const badge = renderToString(() => <Badge variant="primary">Status</Badge>);
  assert(badge.includes('data-badge-variant="primary"'), "Badges must expose their variant");
  assert(
    badge.includes("bg-primary"),
    "Badge defaults must preserve their existing colour classes",
  );
  const heading = renderToString(() => <TableColumnHeader sorted="asc" sortable title="Name" />);
  assert(
    heading.includes('data-sort-direction="asc"'),
    "Column headings must expose sort direction",
  );
  assert(heading.includes("<svg"), "Sorted headings must show a direction arrow");
  assert(!heading.includes(">asc<"), "Sorted headings must not print the raw direction");

  const nestedNotification = renderToString(() => (
    <NotificationItem
      title="Leave request"
      unread
      action={<NotificationActionButton title="Mark as read" />}
    />
  ));
  assert(
    /^<button[^>]*>(?:(?!<\/button>).)*<button/.test(nestedNotification),
    "Notification items must keep their action inside the row button by default",
  );
  const separateNotification = renderToString(() => (
    <NotificationItem
      title="Leave request"
      unread
      separateAction
      action={<NotificationActionButton title="Mark as read" />}
    />
  ));
  assert(
    separateNotification.startsWith("<div"),
    "A separate action must turn the row into a container",
  );
  assert(
    !/<button[^>]*>(?:(?!<\/button>).)*<button/.test(separateNotification),
    "A separate action must not nest a button inside the row button",
  );
  assert(
    separateNotification.includes('data-slot="notification-indicator"'),
    "Notification items must expose their unread indicator",
  );

  const truncatedRow = renderToString(() => <SidebarRow label="Email">a@example.com</SidebarRow>);
  assert(
    truncatedRow.includes('class="text-foreground text-right truncate ml-3"'),
    "Sidebar rows must keep truncating their value by default",
  );
  assert(!truncatedRow.includes("data-overflow"), "Default sidebar rows must not opt in to wrap");
  const wrappedRow = renderToString(() => (
    <SidebarRow label="Email" overflow="wrap">
      a@example.com
    </SidebarRow>
  ));
  assert(wrappedRow.includes('data-overflow="wrap"'), "Wrapping sidebar rows must say so");
  assert(
    wrappedRow.includes("flex-wrap"),
    "A wrapping row must let its value move under the label",
  );
  assert(!wrappedRow.includes("truncate"), "A wrapping row must not clip its value");
  const unlabelledRow = renderToString(() => (
    <SidebarRow label="" overflow="wrap">
      Full-width note
    </SidebarRow>
  ));
  assert(
    !unlabelledRow.includes("text-muted-foreground"),
    "A wrapping row without a label must not render an empty label",
  );
  assert(
    unlabelledRow.includes("w-full"),
    "A wrapping row without a label must give its value the whole row",
  );

  const sidebar = (displayNameLines?: 1 | 2 | 3) =>
    renderToString(() => (
      <DetailSidebar
        isSlim={false}
        onToggle={() => {}}
        header={{ initials: "PR", displayName: "Petra Rowden", displayNameLines }}
        sections={[{ title: "Contact", rows: [{ label: "Email", value: "a@example.com" }] }]}
        rowOverflow={displayNameLines ? "wrap" : undefined}
      />
    ));
  const defaultSidebar = sidebar();
  assert(
    defaultSidebar.includes(
      'class="min-w-0 max-w-full truncate text-sm font-medium leading-tight"',
    ),
    "Detail sidebar names must stay on one line by default",
  );
  assert(!defaultSidebar.includes("data-overflow"), "Detail sidebar rows must truncate by default");
  const wrappedSidebar = sidebar(3);
  assert(
    wrappedSidebar.includes("line-clamp-3"),
    "Detail sidebar names must wrap to the lines asked for",
  );
  assert(
    wrappedSidebar.includes('data-overflow="wrap"'),
    "Detail sidebars must pass row overflow on",
  );
  console.log(
    "ok - app styling hooks: tabs, select, badges, table headings, notifications and sidebars",
  );
}
