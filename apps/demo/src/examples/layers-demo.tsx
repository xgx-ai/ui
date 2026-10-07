import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMoreItems,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchPortal,
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@xgx/ui";
import { createSignal } from "solid-js";

const triggerClass =
  "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input px-3 text-xs hover:bg-hover hover:text-hover-foreground";

/** Floating parts opened inside a portalled popover, each a nested dismissable layer. */
export function NestedLayersDemo() {
  const [actions, setActions] = createSignal<string[]>([]);
  const [submenuChanges, setSubmenuChanges] = createSignal<string[]>([]);
  const [status, setStatus] = createSignal<string | null>(null);
  const [contextAction, setContextAction] = createSignal("No record action yet");
  const record = (action: string) => setActions((entries) => [...entries, action]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nested layers</CardTitle>
        <CardDescription>Popovers, menus and selects opened inside a popover.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <Popover placement="bottom-start">
          <PopoverTrigger class={triggerClass}>Outer panel</PopoverTrigger>
          <PopoverContent data-testid="outer-layer" class="flex w-80 flex-col gap-3">
            <p class="text-xs">Outer panel controls</p>
            <div class="flex flex-wrap items-center gap-2">
              <Popover placement="right-start">
                <PopoverTrigger class={triggerClass}>Inner panel</PopoverTrigger>
                <PopoverContent data-testid="inner-layer" class="flex w-48 flex-col gap-2">
                  <p class="text-xs">Inner panel details</p>
                  <Button size="sm" variant="outline" onClick={() => record("Inner action ran")}>
                    Inner action
                  </Button>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger class={triggerClass}>Panel actions</DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => record("Panel action ran")}>
                      Run panel action
                    </DropdownMenuItem>
                    <DropdownMenuSub
                      onOpenChange={(open) =>
                        setSubmenuChanges((changes) => [...changes, open ? "open" : "closed"])
                      }
                    >
                      <DropdownMenuSubTrigger>More panel actions</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => record("Nested action ran")}>
                            Run nested action
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem>Plain panel action</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
              <DropdownMoreItems triggerLabel="More panel options">
                <DropdownMenuItem onClick={() => record("More option ran")}>
                  Run more option
                </DropdownMenuItem>
              </DropdownMoreItems>
            </div>
            <Select
              options={["Open", "Closed"]}
              placeholder="Choose status"
              value={status()}
              onChange={setStatus}
            >
              <SelectTrigger aria-label="Panel status">
                <SelectValue />
              </SelectTrigger>
              <SearchPortal>
                <SelectContent />
              </SearchPortal>
            </Select>
            <p data-testid="layer-actions" class="text-xs text-muted-foreground">
              {actions().length ? actions().join(", ") : "No actions yet"}
            </p>
          </PopoverContent>
        </Popover>
        <p data-testid="submenu-changes" class="text-xs text-muted-foreground">
          Submenu changes: {submenuChanges().length ? submenuChanges().join(", ") : "none"}
        </p>
        <ContextMenu>
          <ContextMenuTrigger
            data-testid="context-menu-area"
            class="flex h-16 items-center justify-center rounded-md border border-dashed border-border-subtle text-xs text-muted-foreground"
          >
            Right-click for record actions
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setContextAction("Record renamed")}>
              Rename record
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setContextAction("Record moved")}>
              Move record
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <p data-testid="context-menu-result" class="text-xs text-muted-foreground">
          {contextAction()}
        </p>
      </CardContent>
    </Card>
  );
}
