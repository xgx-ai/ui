import type { JSX } from "@solidjs/web";

import { createMemo, Show } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../feedback/tooltip";
import { useCalendarContext } from "./calendar-context";
import type { CalendarEntryContext } from "./calendar-entry";
import type { CalendarEvent, LayoutedEvent } from "./types";

export interface CalendarHeaderEntryProps {
  layoutEvent: LayoutedEvent;
  renderContent?: (event: CalendarEvent, context: CalendarEntryContext) => JSX.Element;
  renderTooltip?: (event: CalendarEvent, context: CalendarEntryContext) => JSX.Element;
}

export function CalendarHeaderEntry(props: CalendarHeaderEntryProps) {
  const { onEventClick, selectedEventId } = useCalendarContext();

  const event = () => props.layoutEvent.event;
  const layoutEvent = () => props.layoutEvent;

  const isCompleted = () => !!event().isCompleted;
  const isSelected = () => selectedEventId() === event().id;
  const colour = () => event().colour || "var(--primary)";
  const colourLight = () => `color-mix(in oklch, ${colour()} 18%, transparent)`;
  const colourMedium = () => `color-mix(in oklch, ${colour()} 34%, transparent)`;

  const positionStyle = createMemo(() => {
    const lane = layoutEvent().lane;
    const laneHeight = 20;
    const laneSpacing = 4;
    const top = lane * (laneHeight + laneSpacing) + 4;

    return {
      top: `${top}px`,
      height: `${laneHeight}px`,
      "z-index": lane + 1,
    };
  });

  const entryStyle = createMemo(() => {
    const pos = positionStyle();

    if (isCompleted()) {
      return {
        ...pos,
        "background-color": "var(--success)",
        "border-color": "var(--success-foreground)",
      };
    }

    return {
      ...pos,
      "background-color": colourLight(),
      "border-color": colourMedium(),
    };
  });

  const context: CalendarEntryContext = {
    get isCompleted() {
      return isCompleted();
    },
    get isShort() {
      return true;
    },
    get colour() {
      return colour();
    },
    get colourLight() {
      return colourLight();
    },
    get timeDisplay() {
      return "";
    },
  };

  const defaultContent = () => (
    <span
      class={`text-[10px] font-medium truncate px-2 ${
        isCompleted() ? "line-through text-success-foreground" : ""
      }`}
      style={{ color: isCompleted() ? undefined : colour() }}
    >
      {event().title}
    </span>
  );

  const defaultTooltip = () => <div class="font-medium">{event().title}</div>;

  return (
    <Tooltip>
      <TooltipTrigger
        as="div"
        class={`absolute left-1 right-1 cursor-pointer transition-all duration-200 hover:shadow-lg rounded border flex items-center ${
          isSelected() ? "ring-2 ring-selected" : ""
        }`}
        style={entryStyle()}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          onEventClick?.(event(), e);
        }}
      >
        <Show when={props.renderContent} fallback={defaultContent()}>
          {props.renderContent!(event(), context)}
        </Show>
      </TooltipTrigger>
      <TooltipContent>
        <Show when={props.renderTooltip} fallback={defaultTooltip()}>
          {props.renderTooltip!(event(), context)}
        </Show>
      </TooltipContent>
    </Tooltip>
  );
}
