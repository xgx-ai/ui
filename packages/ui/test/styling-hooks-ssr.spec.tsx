import { renderToString } from "@solidjs/web";
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
  assert(
    tabs.includes("border-b border-border-subtle"),
    "The shared tab styles must stay unchanged",
  );
  const defaultTabs = renderToString(() => (
    <Tabs>
      <TabsList />
    </Tabs>
  ));
  assert(
    defaultTabs.includes('data-tabs-variant="underline"'),
    "Tabs must expose its default variant",
  );

  const empty = renderToString(() => (
    <Select options={["One"]} value={null} placeholder="Choose an option">
      <SelectValue />
    </Select>
  ));
  assert(
    empty.includes("data-placeholder-shown"),
    "Empty selections must expose placeholder state",
  );
  assert(
    empty.includes('data-placeholder="Choose an option"'),
    "Placeholder text must be available to app CSS",
  );
  assert(!empty.includes(">Choose an option<"), "Shared SelectValue must not add fallback content");
  const custom = renderToString(() => (
    <Select options={["One"]} value={null} placeholder="Choose an option">
      <SelectValue>{(state) => state.selectedOption()?.toString() ?? "Own fallback"}</SelectValue>
    </Select>
  ));
  assert(custom.includes("Own fallback"), "Custom empty-selection rendering must stay intact");
  const selected = renderToString(() => (
    <Select options={[0]} value={0} placeholder="Choose an option">
      <SelectValue />
    </Select>
  ));
  assert(!selected.includes("data-placeholder-shown"), "A selected zero must not appear empty");

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
  assert(heading.includes(">asc<"), "The shared sort label must retain its original text");
  console.log("ok - app styling hooks: tabs, select, badges and table headings");
}
