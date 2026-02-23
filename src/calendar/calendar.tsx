import type { Accessor, JSX } from "solid-js";
import { Show } from "solid-js";
import { Button } from "../forms/button";
import { Card } from "../layout/card";
import {
  CalendarProvider,
  type CalendarProviderProps,
  useCalendarContext,
} from "./calendar-context";
import { CalendarDayView } from "./calendar-day-view";
import type { CalendarEntryContext } from "./calendar-entry";
import { CalendarHeaderNav } from "./calendar-header-nav";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarWeekView } from "./calendar-week-view";
import type { CalendarEvent } from "./types";

export interface CalendarProps
  extends Omit<CalendarProviderProps, "children" | "events"> {
  events: CalendarEvent[] | Accessor<CalendarEvent[]>;
  class?: string;
  hideViewModeToggle?: boolean;
  hideDayHeader?: boolean;
  renderEventContent?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
  renderTooltip?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
  headerLeft?: JSX.Element;
  headerRight?: JSX.Element;
}

function CalendarInner(props: {
  class?: string;
  hideViewModeToggle?: boolean;
  hideDayHeader?: boolean;
  renderEventContent?: CalendarProps["renderEventContent"];
  renderTooltip?: CalendarProps["renderTooltip"];
  headerLeft?: JSX.Element;
  headerRight?: JSX.Element;
}) {
  const { viewMode, setViewMode } = useCalendarContext();

  return (
    <Card class={`h-full flex flex-col overflow-hidden ${props.class ?? ""}`}>
      <div class="flex items-center justify-between p-4 border-b">
        <div class={props.hideViewModeToggle ? "" : "w-32"}>
          {props.headerLeft}
        </div>

        <CalendarHeaderNav />

        <div class="flex items-center gap-2">
          {props.headerRight}
          <Show when={!props.hideViewModeToggle}>
            <div class="bg-muted rounded-md overflow-hidden flex">
              <Button
                variant={viewMode() === "day" ? "default" : "ghost"}
                size="sm"
                class="h-8 px-3 text-xs rounded-none"
                onClick={() => setViewMode("day")}
              >
                Day
              </Button>
              <Button
                variant={viewMode() === "week" ? "default" : "ghost"}
                size="sm"
                class="h-8 px-3 text-xs rounded-none"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode() === "month" ? "default" : "ghost"}
                size="sm"
                class="h-8 px-3 text-xs rounded-none"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
            </div>
          </Show>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <Show when={viewMode() === "day"}>
          <CalendarDayView
            renderEventContent={props.renderEventContent}
            renderTooltip={props.renderTooltip}
            hideDayHeader={props.hideDayHeader}
          />
        </Show>
        <Show when={viewMode() === "week"}>
          <CalendarWeekView
            renderEventContent={props.renderEventContent}
            renderTooltip={props.renderTooltip}
          />
        </Show>
        <Show when={viewMode() === "month"}>
          <CalendarMonthView
            renderEventContent={props.renderEventContent}
            renderTooltip={props.renderTooltip}
          />
        </Show>
      </div>
    </Card>
  );
}

export function Calendar(props: CalendarProps) {
  const eventsAccessor =
    typeof props.events === "function" ? props.events : () => props.events;

  return (
    <CalendarProvider
      events={eventsAccessor as Accessor<CalendarEvent[]>}
      defaultViewMode={props.defaultViewMode}
      defaultDate={props.defaultDate}
      onEventClick={props.onEventClick}
      onEventMove={props.onEventMove}
      onEventResize={props.onEventResize}
      onSlotClick={props.onSlotClick}
      weekStartsOn={props.weekStartsOn}
    >
      <CalendarInner
        class={props.class}
        hideViewModeToggle={props.hideViewModeToggle}
        hideDayHeader={props.hideDayHeader}
        renderEventContent={props.renderEventContent}
        renderTooltip={props.renderTooltip}
        headerLeft={props.headerLeft}
        headerRight={props.headerRight}
      />
    </CalendarProvider>
  );
}
