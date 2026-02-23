import {
  addDays,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { JSX } from "solid-js";
import { createMemo, For, Show } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../feedback/tooltip";
import { useCalendarContext } from "./calendar-context";
import type { CalendarEntryContext } from "./calendar-entry";
import type { CalendarEvent } from "./types";

const MAX_VISIBLE_EVENTS = 3;

export interface CalendarMonthViewProps {
  renderEventContent?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
  renderTooltip?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
}

export function CalendarMonthView(props: CalendarMonthViewProps) {
  const { currentDate, getEventsForDay, onEventClick } = useCalendarContext();

  const monthDays = createMemo(() => {
    const monthStart = startOfMonth(currentDate());
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(startWeek, i));
  });

  const weekDayLabels = createMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  const createContext = (event: CalendarEvent): CalendarEntryContext => ({
    isCompleted: !!event.isCompleted,
    isShort: true,
    colour: event.colour ?? "#8b5cf6",
    colourLight: `${event.colour ?? "#8b5cf6"}20`,
    timeDisplay: "",
  });

  return (
    <div class="h-full overflow-auto p-4">
      <div class="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day of week headers */}
        <For each={weekDayLabels()}>
          {(day) => (
            <div class="bg-gray-50 p-2 text-center">
              <span class="text-[11px] uppercase tracking-wider font-medium text-gray-500">
                {format(day, "EEE")}
              </span>
            </div>
          )}
        </For>

        {/* Day cells */}
        <For each={monthDays()}>
          {(day) => {
            const isCurrentMonth = isSameMonth(day, currentDate());
            const isToday = isSameDay(day, new Date());
            const dayEvents = createMemo(() => getEventsForDay(day));
            const visibleEvents = createMemo(() =>
              dayEvents().slice(0, MAX_VISIBLE_EVENTS),
            );
            const hiddenCount = createMemo(() =>
              Math.max(0, dayEvents().length - MAX_VISIBLE_EVENTS),
            );

            return (
              <div
                class={`bg-card min-h-[100px] p-1 ${
                  !isCurrentMonth ? "bg-gray-50/50" : ""
                }`}
              >
                <div
                  class={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full"
                      : isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                  }`}
                >
                  {format(day, "d")}
                </div>

                <div class="space-y-0.5">
                  <For each={visibleEvents()}>
                    {(event) => (
                      <Tooltip>
                        <TooltipTrigger
                          as="div"
                          class="px-1.5 py-0.5 rounded border text-[10px] truncate cursor-pointer hover:shadow"
                          style={{
                            "background-color": `${event.colour ?? "#8b5cf6"}20`,
                            "border-color": `${event.colour ?? "#8b5cf6"}40`,
                            color: event.colour ?? "#8b5cf6",
                          }}
                          onClick={(e: MouseEvent) => onEventClick?.(event, e)}
                        >
                          {event.title}
                        </TooltipTrigger>
                        <TooltipContent>
                          <Show
                            when={props.renderTooltip}
                            fallback={
                              <div class="font-medium">{event.title}</div>
                            }
                          >
                            {props.renderTooltip!(event, createContext(event))}
                          </Show>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </For>

                  <Show when={hiddenCount() > 0}>
                    <div class="text-[10px] text-gray-500 px-1">
                      +{hiddenCount()} more
                    </div>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
