import {
  addDays,
  addMonths,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Accessor, JSX } from "solid-js";
import { createContext, createMemo, createSignal, useContext } from "solid-js";
import type {
  CalendarEvent,
  CalendarViewMode,
  EventMoveData,
  EventResizeData,
  SlotClickData,
} from "./types";

export interface CalendarContextValue {
  // View state
  viewMode: Accessor<CalendarViewMode>;
  setViewMode: (mode: CalendarViewMode) => void;
  currentDate: Accessor<Date>;
  setCurrentDate: (date: Date) => void;
  startDate: Accessor<Date>;
  endDate: Accessor<Date>;

  // Navigation
  goToNext: () => void;
  goToPrev: () => void;
  goToDate: (date: Date) => void;
  goToToday: () => void;

  // Computed
  weekDays: Accessor<Date[]>;

  // Events (passed in from parent)
  events: Accessor<CalendarEvent[]>;
  getEventsForDay: (date: Date) => CalendarEvent[];

  // Selection
  selectedEventId: Accessor<string | null>;
  setSelectedEventId: (id: string | null) => void;

  // Callbacks
  onEventClick?: (event: CalendarEvent, mouseEvent: MouseEvent) => void;
  onEventMove?: (data: EventMoveData) => void;
  onEventResize?: (data: EventResizeData) => void;
  onSlotClick?: (data: SlotClickData) => void;
}

const CalendarContext = createContext<CalendarContextValue>();

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider",
    );
  }
  return context;
};

export interface CalendarProviderProps {
  children: JSX.Element;
  events: Accessor<CalendarEvent[]>;
  defaultViewMode?: CalendarViewMode;
  defaultDate?: Date;
  onEventClick?: (event: CalendarEvent, mouseEvent: MouseEvent) => void;
  onEventMove?: (data: EventMoveData) => void;
  onEventResize?: (data: EventResizeData) => void;
  onSlotClick?: (data: SlotClickData) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function CalendarProvider(props: CalendarProviderProps) {
  const weekStartsOn = props.weekStartsOn ?? 1;

  const [viewMode, setViewMode] = createSignal<CalendarViewMode>(
    props.defaultViewMode ?? "week",
  );
  const [currentDate, setCurrentDate] = createSignal(
    props.defaultDate ?? new Date(),
  );
  const [selectedEventId, setSelectedEventId] = createSignal<string | null>(
    null,
  );

  const startDate = createMemo(() => {
    const mode = viewMode();
    const date = currentDate();

    if (mode === "day") {
      return date;
    }
    if (mode === "week") {
      return startOfWeek(date, { weekStartsOn });
    }
    // month
    const monthStart = startOfMonth(date);
    return startOfWeek(monthStart, { weekStartsOn });
  });

  const endDate = createMemo(() => {
    const mode = viewMode();
    const date = currentDate();

    if (mode === "day") {
      return date;
    }
    if (mode === "week") {
      return endOfWeek(date, { weekStartsOn });
    }
    // month - 6 weeks grid
    return addDays(startDate(), 41);
  });

  const weekDays = createMemo(() => {
    const start = startOfWeek(currentDate(), { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return props.events().filter((event) => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate ?? event.startDate;
      // For all-day events, end date is exclusive (midnight of next day)
      if (event.isAllDay) {
        return eventStart <= dayEnd && eventEnd > dayStart;
      }
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const updateDatesForMode = (date: Date, _mode: CalendarViewMode) => {
    setCurrentDate(date);
  };

  const goToNext = () => {
    const mode = viewMode();
    const date = currentDate();

    if (mode === "day") {
      updateDatesForMode(addDays(date, 1), mode);
    } else if (mode === "week") {
      updateDatesForMode(addDays(date, 7), mode);
    } else {
      updateDatesForMode(addMonths(date, 1), mode);
    }
  };

  const goToPrev = () => {
    const mode = viewMode();
    const date = currentDate();

    if (mode === "day") {
      updateDatesForMode(addDays(date, -1), mode);
    } else if (mode === "week") {
      updateDatesForMode(addDays(date, -7), mode);
    } else {
      updateDatesForMode(addMonths(date, -1), mode);
    }
  };

  const goToDate = (date: Date) => {
    updateDatesForMode(date, viewMode());
  };

  const goToToday = () => {
    updateDatesForMode(new Date(), viewMode());
  };

  const handleEventClick = (event: CalendarEvent, mouseEvent: MouseEvent) => {
    setSelectedEventId(event.id);
    props.onEventClick?.(event, mouseEvent);
  };

  const value: CalendarContextValue = {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    startDate,
    endDate,
    goToNext,
    goToPrev,
    goToDate,
    goToToday,
    weekDays,
    events: props.events,
    getEventsForDay,
    selectedEventId,
    setSelectedEventId,
    onEventClick: handleEventClick,
    onEventMove: props.onEventMove,
    onEventResize: props.onEventResize,
    onSlotClick: props.onSlotClick,
  };

  return (
    <CalendarContext.Provider value={value}>
      {props.children}
    </CalendarContext.Provider>
  );
}
