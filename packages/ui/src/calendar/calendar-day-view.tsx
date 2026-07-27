import type { JSX } from "@solidjs/web";
import { format, isSameDay } from "date-fns";

import { createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { useCalendarContext } from "./calendar-context";
import { CalendarEntry, type CalendarEntryContext } from "./calendar-entry";
import { CalendarHeaderEntry } from "./calendar-header-entry";
import { isHeaderEvent, layoutEvents } from "./calendar-utils";
import type { CalendarEvent } from "./types";

const DEFAULT_START_HOUR = 0;
const DEFAULT_END_HOUR = 24;
const PIXELS_PER_HOUR = 48;
const SNAP_MINUTES = 15;

export interface CalendarDayViewProps {
  renderEventContent?: (event: CalendarEvent, context: CalendarEntryContext) => JSX.Element;
  renderTooltip?: (event: CalendarEvent, context: CalendarEntryContext) => JSX.Element;
  /** Hide the day name + date number sticky header */
  hideDayHeader?: boolean;
  /** First visible hour (default 0) */
  startHour?: number;
  /** Last visible hour (default 24) */
  endHour?: number;
}

export function CalendarDayView(props: CalendarDayViewProps) {
  const { currentDate, getEventsForDay, onSlotClick } = useCalendarContext();

  const START_HOUR = () => props.startHour ?? DEFAULT_START_HOUR;
  const END_HOUR = () => props.endHour ?? DEFAULT_END_HOUR;
  const VISIBLE_HOURS = () => END_HOUR() - START_HOUR();

  let scrollRef: HTMLDivElement | undefined;

  const [now, setNow] = createSignal(new Date());
  onSettled(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  });

  onSettled(() => {
    if (START_HOUR() === 0) {
      requestAnimationFrame(() => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const scrollTop = Math.max(0, (currentMinutes / 60 - 1) * PIXELS_PER_HOUR);
        scrollRef?.scrollTo({ top: scrollTop });
      });
    }
  });

  const hours = createMemo(() =>
    Array.from({ length: VISIBLE_HOURS() }, (_, i) => i + START_HOUR()),
  );

  const dayEvents = createMemo(() => getEventsForDay(currentDate()));

  const layoutedEvents = createMemo(() => layoutEvents(dayEvents(), currentDate(), dayEvents()));

  const headerEvents = createMemo(() =>
    layoutedEvents().filter((le) => le.isMultiDay || le.isAllDay || isHeaderEvent(le.event)),
  );

  const regularEvents = createMemo(() =>
    layoutedEvents().filter((le) => !le.isMultiDay && !le.isAllDay && !isHeaderEvent(le.event)),
  );

  const headerSpace = createMemo(() => {
    const count = headerEvents().length;
    return count > 0 ? count * 24 + 8 : 0;
  });

  const isToday = createMemo(() => isSameDay(currentDate(), new Date()));

  return (
    <div ref={scrollRef} class="h-full overflow-auto bg-card">
      <div
        class="grid text-sm min-w-full"
        style={{
          "grid-template-columns": "48px 1fr",
          "min-height": `${VISIBLE_HOURS() * 48}px`,
        }}
      >
        {/* Header row — sticky, includes all-day events */}
        <Show when={!props.hideDayHeader}>
          <div class="sticky top-0 z-20 bg-card border-b" />
          <div class="sticky top-0 z-20 bg-card border-b">
            <div class="p-2 text-center">
              <span class="text-[11px] uppercase tracking-wider text-muted-foreground">
                {format(currentDate(), "EEEE")}
              </span>
              <div
                class={`text-xl font-semibold mt-0.5 ${
                  isToday()
                    ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    : ""
                }`}
              >
                {format(currentDate(), "d")}
              </div>
            </div>
            <Show when={headerEvents().length > 0}>
              <div class="relative" style={{ height: `${headerSpace()}px` }}>
                <For each={headerEvents()}>
                  {(layoutEvent) => (
                    <CalendarHeaderEntry
                      layoutEvent={layoutEvent}
                      renderContent={props.renderEventContent}
                      renderTooltip={props.renderTooltip}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* Time labels column */}
        <div class="sticky left-0 bg-card z-10">
          <For each={hours()} keyed={false}>
            {(hour) => (
              <div class="h-12 pr-3 flex items-start justify-end">
                <span class="text-[11px] text-muted-foreground -mt-1.5">
                  {hour().toString().padStart(2, "0")}:00
                </span>
              </div>
            )}
          </For>
        </div>

        {/* Day column */}
        <div
          class="relative min-h-full cursor-pointer"
          onClick={(e: MouseEvent) => {
            if (!onSlotClick) return;
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            if (clickY < 0) return;
            const totalMinutes = START_HOUR() * 60 + (clickY / PIXELS_PER_HOUR) * 60;
            const snappedMinutes = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
            const date = new Date(currentDate());
            date.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
            const endDate = new Date(date.getTime() + 30 * 60 * 1000);
            onSlotClick({ date, endDate });
          }}
        >
          {/* Hour grid lines */}
          <div>
            <For each={hours()} keyed={false}>
              {() => <div class="h-12 border-b border-border-subtle hover:bg-hover" />}
            </For>
          </div>

          {/* Regular event entries */}
          <For each={regularEvents()}>
            {(layoutEvent) => (
              <CalendarEntry
                layoutEvent={layoutEvent}
                day={currentDate()}
                headerSpace={0}
                startHour={START_HOUR()}
                visibleHours={VISIBLE_HOURS()}
                renderContent={props.renderEventContent}
                renderTooltip={props.renderTooltip}
              />
            )}
          </For>

          {/* Current time indicator */}
          <Show when={isToday()}>
            <div
              class="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${((now().getHours() * 60 + now().getMinutes()) / 60 - START_HOUR()) * PIXELS_PER_HOUR}px`,
                "z-index": "5",
              }}
            >
              <div class="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-error-foreground" />
              <div class="w-full h-0.5 bg-error-foreground" />
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
