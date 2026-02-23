import { format, isSameDay } from "date-fns";
import type { JSX } from "solid-js";
import {
  createMemo,
  createSignal,
  For,
  Index,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useCalendarContext } from "./calendar-context";
import { CalendarEntry, type CalendarEntryContext } from "./calendar-entry";
import { CalendarHeaderEntry } from "./calendar-header-entry";
import { isHeaderEvent, layoutEvents } from "./calendar-utils";
import type { CalendarEvent } from "./types";

export const START_HOUR = 0;
export const END_HOUR = 24;
export const VISIBLE_HOURS = END_HOUR - START_HOUR;

export interface CalendarWeekViewProps {
  renderEventContent?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
  renderTooltip?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
}

const PIXELS_PER_HOUR = 48;
const SNAP_MINUTES = 15;

export function CalendarWeekView(props: CalendarWeekViewProps) {
  const { weekDays, getEventsForDay, onSlotClick } = useCalendarContext();

  let scrollRef: HTMLDivElement | undefined;

  const [now, setNow] = createSignal(new Date());
  const timer = setInterval(() => setNow(new Date()), 60_000);
  onCleanup(() => clearInterval(timer));

  onMount(() => {
    scrollRef?.scrollTo({ top: 8 * PIXELS_PER_HOUR });
  });

  const hours = Array.from({ length: VISIBLE_HOURS }, (_, i) => i + START_HOUR);

  // Compute layout for all 7 days at the top level so both header and day columns can access it
  const allWeekEvents = createMemo(() =>
    weekDays().flatMap((d) => getEventsForDay(d)),
  );

  const weekLayoutData = createMemo(() => {
    const allEvts = allWeekEvents();
    return weekDays().map((day) => {
      const dayEvts = getEventsForDay(day);
      const layouted = layoutEvents(dayEvts, day, allEvts);
      return {
        headerEvents: layouted.filter(
          (le) => le.isMultiDay || le.isAllDay || isHeaderEvent(le.event),
        ),
        regularEvents: layouted.filter(
          (le) => !le.isMultiDay && !le.isAllDay && !isHeaderEvent(le.event),
        ),
      };
    });
  });

  const headerLaneCount = createMemo(() => {
    const headerEvents = allWeekEvents().filter((e) => isHeaderEvent(e));
    if (headerEvents.length === 0) return 0;

    const lanes: { endDate: Date }[] = [];
    const sorted = [...headerEvents].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );

    for (const event of sorted) {
      const eventEnd =
        event.endDate || new Date(event.startDate.getTime() + 30 * 60 * 1000);
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (event.startDate >= lanes[i].endDate) {
          lanes[i] = { endDate: eventEnd };
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push({ endDate: eventEnd });
      }
    }
    return lanes.length;
  });

  const headerSpace = createMemo(() =>
    headerLaneCount() > 0 ? headerLaneCount() * 24 + 8 : 0,
  );

  return (
    <div ref={scrollRef} class="h-full overflow-auto bg-card">
      <div
        class="grid text-sm min-w-full"
        style={{
          "grid-template-columns": "48px repeat(7, minmax(0, 1fr))",
          "min-height": `${VISIBLE_HOURS * 48}px`,
        }}
      >
        {/* Header row — sticky, includes all-day events */}
        <div class="sticky top-0 z-20 bg-card border-b" />
        <Index each={weekDays()}>
          {(day, dayIndex) => {
            const isToday = isSameDay(day(), new Date());
            const dayData = () => weekLayoutData()[dayIndex];
            return (
              <div class="sticky top-0 z-20 bg-card border-b">
                <div class="p-2 text-center">
                  <span class="text-[11px] uppercase tracking-wider text-gray-500">
                    {format(day(), "EEE")}
                  </span>
                  <div
                    class={`text-lg font-semibold mt-0.5 ${
                      isToday
                        ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                        : ""
                    }`}
                  >
                    {format(day(), "d")}
                  </div>
                </div>
                <Show when={headerSpace() > 0}>
                  <div
                    class="relative"
                    style={{
                      height: `${headerSpace()}px`,
                    }}
                  >
                    <For each={dayData().headerEvents}>
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
            );
          }}
        </Index>

        {/* Time labels column */}
        <div class="sticky left-0 bg-card z-10">
          <Index each={hours}>
            {(hour) => (
              <div class="h-12 pr-3 flex items-start justify-end">
                <span class="text-[11px] text-gray-400 -mt-1.5">
                  {hour().toString().padStart(2, "0")}:00
                </span>
              </div>
            )}
          </Index>
        </div>

        {/* Day columns — regular events only */}
        <Index each={weekDays()}>
          {(day, dayIndex) => {
            const dayData = () => weekLayoutData()[dayIndex];
            const isLastDay = dayIndex === 6;

            const handleSlotClick = (e: MouseEvent) => {
              if (!onSlotClick) return;
              const target = e.currentTarget as HTMLElement;
              const rect = target.getBoundingClientRect();
              const clickY = e.clientY - rect.top;
              if (clickY < 0) return;
              const totalMinutes =
                START_HOUR * 60 + (clickY / PIXELS_PER_HOUR) * 60;
              const snappedMinutes =
                Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
              const date = new Date(day());
              date.setHours(
                Math.floor(snappedMinutes / 60),
                snappedMinutes % 60,
                0,
                0,
              );
              const endDate = new Date(date.getTime() + 30 * 60 * 1000);
              onSlotClick({ date, endDate });
            };

            return (
              <div
                class="relative min-h-full cursor-pointer"
                style={{
                  "border-right": isLastDay ? "none" : "1px solid #f3f4f6",
                }}
                onClick={handleSlotClick}
              >
                {/* Hour grid lines */}
                <div>
                  <Index each={hours}>
                    {() => (
                      <div
                        class="h-12 hover:bg-gray-50"
                        style={{
                          "border-bottom": "1px solid #f9fafb",
                        }}
                      />
                    )}
                  </Index>
                </div>

                {/* Regular events only */}
                <For each={dayData().regularEvents}>
                  {(layoutEvent) => (
                    <CalendarEntry
                      layoutEvent={layoutEvent}
                      day={day()}
                      headerSpace={0}
                      startHour={START_HOUR}
                      visibleHours={VISIBLE_HOURS}
                      renderContent={props.renderEventContent}
                      renderTooltip={props.renderTooltip}
                    />
                  )}
                </For>

                {/* Current time indicator */}
                <Show when={isSameDay(day(), now())}>
                  <div
                    class="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top: `${((now().getHours() * 60 + now().getMinutes()) / 60) * PIXELS_PER_HOUR}px`,
                      "z-index": "5",
                    }}
                  >
                    <div class="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                    <div class="w-full h-0.5 bg-red-500" />
                  </div>
                </Show>
              </div>
            );
          }}
        </Index>
      </div>
    </div>
  );
}
