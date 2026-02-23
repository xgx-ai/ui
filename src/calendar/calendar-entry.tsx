import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  startOfDay,
} from "date-fns";
import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../feedback/tooltip";
import { useCalendarContext } from "./calendar-context";
import type { CalendarEvent, LayoutedEvent } from "./types";

type DragMode = "move" | "resize-top" | "resize-bottom" | null;

export interface CalendarEntryProps {
  layoutEvent: LayoutedEvent;
  day: Date;
  headerSpace: number;
  startHour: number;
  visibleHours: number;
  renderContent?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
  renderTooltip?: (
    event: CalendarEvent,
    context: CalendarEntryContext,
  ) => JSX.Element;
}

export interface CalendarEntryContext {
  isCompleted: boolean;
  isShort: boolean;
  colour: string;
  colourLight: string;
  timeDisplay: string;
}

const PIXELS_PER_HOUR = 48;
const SNAP_MINUTES = 15;

export function CalendarEntry(props: CalendarEntryProps) {
  const { onEventClick, selectedEventId, onEventMove, onEventResize } =
    useCalendarContext();

  const event = () => props.layoutEvent.event;
  const layoutEvent = () => props.layoutEvent;

  const dayStart = startOfDay(props.day);
  const displayStart = createMemo(() =>
    event().startDate < dayStart ? dayStart : event().startDate,
  );

  const displayEnd = createMemo(() => {
    const endDate = event().endDate;
    if (endDate) {
      return endDate > addDays(dayStart, 1) ? addDays(dayStart, 1) : endDate;
    }
    return addMinutes(event().startDate, 30);
  });

  const durationMinutes = createMemo(() =>
    differenceInMinutes(displayEnd(), displayStart()),
  );
  const isShort = () => durationMinutes() <= 30;
  const hasOverlaps = () => layoutEvent().totalColumns > 1;
  const isCompleted = () => !!event().isCompleted;
  const isSelected = () => selectedEventId() === event().id;

  const colour = () => event().colour || "#3b82f6";
  const colourLight = () => `${colour()}20`;
  const colourMedium = () => `${colour()}40`;

  // Drag state
  const [dragMode, setDragMode] = createSignal<DragMode>(null);
  const [dragOffset, setDragOffset] = createSignal({
    top: 0,
    height: 0,
    translateX: 0,
  });

  const isDragging = () => dragMode() !== null;
  const canDrag = () => !!onEventMove;
  const canResize = () => !!onEventResize;

  const snapToGrid = (minutes: number): number => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  // Refs for draggable elements
  let entryRef: HTMLDivElement | undefined;
  let topHandleRef: HTMLDivElement | undefined;
  let bottomHandleRef: HTMLDivElement | undefined;

  // Drag state tracking
  let dragStartY = 0;
  let dragStartX = 0;
  let columnWidth = 0;
  let dayDelta = 0;

  const getColumnWidth = (): number => {
    // The entry's parent is the day column; measure its width
    const parent = entryRef?.parentElement;
    if (parent) return parent.getBoundingClientRect().width;
    return 0;
  };

  const handleDragMove = (
    clientX: number,
    clientY: number,
    mode: NonNullable<DragMode>,
  ) => {
    const deltaY = clientY - dragStartY;
    const deltaMinutes = (deltaY / PIXELS_PER_HOUR) * 60;
    const snappedMinutes = snapToGrid(deltaMinutes);
    const snappedPixels = (snappedMinutes / 60) * PIXELS_PER_HOUR;

    if (mode === "move") {
      // Calculate horizontal day offset
      const deltaX = clientX - dragStartX;
      dayDelta = columnWidth > 0 ? Math.round(deltaX / columnWidth) : 0;
      const translateX = dayDelta * columnWidth;

      setDragOffset({ top: snappedPixels, height: 0, translateX });
    } else if (mode === "resize-top") {
      setDragOffset({
        top: snappedPixels,
        height: -snappedPixels,
        translateX: 0,
      });
    } else if (mode === "resize-bottom") {
      setDragOffset({ top: 0, height: snappedPixels, translateX: 0 });
    }
  };

  const handleDragEnd = (mode: NonNullable<DragMode>) => {
    const offset = dragOffset();
    const deltaMinutes = (offset.top / PIXELS_PER_HOUR) * 60;
    const heightDeltaMinutes = (offset.height / PIXELS_PER_HOUR) * 60;

    if (deltaMinutes !== 0 || heightDeltaMinutes !== 0 || dayDelta !== 0) {
      const currentStart = event().startDate;
      const currentEnd = event().endDate ?? addMinutes(currentStart, 30);

      if (mode === "move" && onEventMove) {
        let newStart = addMinutes(currentStart, deltaMinutes);
        let newEnd = addMinutes(currentEnd, deltaMinutes);
        // Apply horizontal day shift
        if (dayDelta !== 0) {
          newStart = addDays(newStart, dayDelta);
          newEnd = addDays(newEnd, dayDelta);
        }
        onEventMove({
          event: event(),
          startDate: newStart,
          endDate: newEnd,
        });
      } else if (mode === "resize-top" && onEventResize) {
        const newStart = addMinutes(currentStart, deltaMinutes);
        onEventResize({
          event: event(),
          startDate: newStart,
          endDate: currentEnd,
        });
      } else if (mode === "resize-bottom" && onEventResize) {
        const newEnd = addMinutes(currentEnd, heightDeltaMinutes);
        onEventResize({
          event: event(),
          startDate: currentStart,
          endDate: newEnd,
        });
      }
    }

    dayDelta = 0;
    setDragMode(null);
    setDragOffset({ top: 0, height: 0, translateX: 0 });
  };

  // Set up draggable for main entry (move)
  createEffect(() => {
    const el = entryRef;
    if (!el || !canDrag()) return;

    const cleanup = draggable({
      element: el,
      getInitialData: () => ({
        type: "calendar-event",
        eventId: event().id,
        mode: "move" as DragMode,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        // Use a 1x1 transparent image to hide native preview
        if (nativeSetDragImage) {
          const img = new Image();
          img.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          nativeSetDragImage(img, 0, 0);
        }
      },
      onDragStart: ({ location }) => {
        dragStartY = location.initial.input.clientY;
        dragStartX = location.initial.input.clientX;
        columnWidth = getColumnWidth();
        dayDelta = 0;
        setDragMode("move");
      },
      onDrag: ({ location }) => {
        handleDragMove(
          location.current.input.clientX,
          location.current.input.clientY,
          "move",
        );
      },
      onDrop: () => {
        handleDragEnd("move");
      },
    });

    onCleanup(cleanup);
  });

  // Set up draggable for top resize handle
  createEffect(() => {
    const el = topHandleRef;
    if (!el || !canResize()) return;

    const cleanup = draggable({
      element: el,
      getInitialData: () => ({
        type: "calendar-event-resize",
        eventId: event().id,
        mode: "resize-top" as DragMode,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        if (nativeSetDragImage) {
          const img = new Image();
          img.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          nativeSetDragImage(img, 0, 0);
        }
      },
      onDragStart: ({ location }) => {
        dragStartY = location.initial.input.clientY;
        setDragMode("resize-top");
      },
      onDrag: ({ location }) => {
        handleDragMove(
          location.current.input.clientX,
          location.current.input.clientY,
          "resize-top",
        );
      },
      onDrop: () => {
        handleDragEnd("resize-top");
      },
    });

    onCleanup(cleanup);
  });

  // Set up draggable for bottom resize handle
  createEffect(() => {
    const el = bottomHandleRef;
    if (!el || !canResize()) return;

    const cleanup = draggable({
      element: el,
      getInitialData: () => ({
        type: "calendar-event-resize",
        eventId: event().id,
        mode: "resize-bottom" as DragMode,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        if (nativeSetDragImage) {
          const img = new Image();
          img.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          nativeSetDragImage(img, 0, 0);
        }
      },
      onDragStart: ({ location }) => {
        dragStartY = location.initial.input.clientY;
        setDragMode("resize-bottom");
      },
      onDrag: ({ location }) => {
        handleDragMove(
          location.current.input.clientX,
          location.current.input.clientY,
          "resize-bottom",
        );
      },
      onDrop: () => {
        handleDragEnd("resize-bottom");
      },
    });

    onCleanup(cleanup);
  });

  const timeDisplay = createMemo(
    () =>
      `${format(displayStart(), "HH:mm")} - ${format(displayEnd(), "HH:mm")}`,
  );

  const basePositionStyle = createMemo(() => {
    const topFromMidnight = (layoutEvent().top / 100) * 24 * PIXELS_PER_HOUR;
    const startHourOffset = props.startHour * PIXELS_PER_HOUR;
    const topInPixels = topFromMidnight - startHourOffset;
    const heightInPixels = (layoutEvent().height / 100) * 24 * PIXELS_PER_HOUR;
    const minHeight = hasOverlaps() ? 20 : 28;

    return {
      top: topInPixels + props.headerSpace,
      height: Math.max(heightInPixels, minHeight),
    };
  });

  const positionStyle = createMemo(() => {
    const base = basePositionStyle();
    const offset = dragOffset();
    const top = base.top + offset.top;
    const height = base.height + offset.height;
    const translateX = offset.translateX;

    const baseStyle = {
      height: `${Math.max(height, 20)}px`,
      ...(translateX !== 0 ? { transform: `translateX(${translateX}px)` } : {}),
    };

    if (hasOverlaps()) {
      const totalColumns = layoutEvent().totalColumns;
      const colIndex = layoutEvent().colIndex;
      const widthPercent = 100 / totalColumns;
      const leftPercent = colIndex * widthPercent;

      return {
        ...baseStyle,
        top: `${top}px`,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 2px)`,
        "z-index": isDragging() ? 100 : layoutEvent().colIndex + 1,
      };
    }

    return {
      ...baseStyle,
      top: `${top}px`,
      left: "1px",
      width: "calc(100% - 2px)",
      "z-index": isDragging() ? 100 : 1,
    };
  });

  const entryStyle = createMemo(() => {
    const pos = positionStyle();

    if (isCompleted()) {
      return {
        ...pos,
        "background-color": "#f0fdf4",
        "border-color": "#bbf7d0",
        opacity: isDragging() ? 0.8 : 0.9,
      };
    }

    return {
      ...pos,
      "background-color": colourLight(),
      "border-color": colourMedium(),
      opacity: isDragging() ? 0.8 : 1,
    };
  });

  const context: CalendarEntryContext = {
    get isCompleted() {
      return isCompleted();
    },
    get isShort() {
      return isShort();
    },
    get colour() {
      return colour();
    },
    get colourLight() {
      return colourLight();
    },
    get timeDisplay() {
      return timeDisplay();
    },
  };

  const defaultContent = () => (
    <div class="flex items-center gap-1 min-w-0 h-full px-2 pointer-events-none">
      <div
        class="w-2 h-2 rounded-full shrink-0"
        style={{ "background-color": colour() }}
      />
      <span
        class={`text-[10px] font-medium truncate ${isCompleted() ? "line-through" : ""}`}
        style={{ color: colour() }}
      >
        {event().title}
      </span>
      <span class="text-[9px] ml-auto shrink-0" style={{ color: colour() }}>
        {timeDisplay()}
      </span>
    </div>
  );

  const defaultTooltip = () => (
    <div class="space-y-1">
      <div class="font-medium">{event().title}</div>
      <div class="text-muted-foreground">{timeDisplay()}</div>
    </div>
  );

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isDragging()) {
      onEventClick?.(event(), e);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        as="div"
        class={`absolute border rounded-md group select-none ${
          isSelected() ? "ring-2 ring-primary" : ""
        } ${isDragging() ? "shadow-lg z-50 cursor-grabbing" : "transition-all duration-200 hover:shadow-lg hover:z-30 cursor-grab"}`}
        style={entryStyle()}
        onClick={handleClick}
        ref={entryRef}
      >
        {/* Top resize handle */}
        <Show when={canResize() && !isShort()}>
          <div
            ref={topHandleRef}
            class="absolute top-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 z-10 flex items-start justify-center"
          >
            <div
              class="mt-1 w-8 h-1 rounded-full"
              style={{ "background-color": colour() }}
            />
          </div>
        </Show>

        <Show when={props.renderContent} fallback={defaultContent()}>
          {props.renderContent!(event(), context)}
        </Show>

        {/* Bottom resize handle */}
        <Show when={canResize()}>
          <div
            ref={bottomHandleRef}
            class="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 z-10 flex items-end justify-center"
          >
            <div
              class="mb-1 w-8 h-1 rounded-full"
              style={{ "background-color": colour() }}
            />
          </div>
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
