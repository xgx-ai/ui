import { createEffect, createRoot, createSignal, flush } from "solid-js";
import {
  CalendarProvider,
  useCalendarContext,
  type CalendarContextValue,
} from "../src/calendar/calendar-context";
import type { CalendarViewMode } from "../src/calendar/types";

function realise(value: unknown): void {
  if (typeof value === "function") realise(value());
  else if (Array.isArray(value)) value.forEach(realise);
}
function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
}
function time(date: Date | undefined) {
  return date?.getTime();
}

const initialDate = new Date(2026, 9, 7);
const changedDate = new Date(2026, 9, 21);

/** Renders a provider owned by a root and exposes its context for imperative interaction. */
function mount(
  render: (capture: () => null) => unknown,
  observe?: (calendar: CalendarContextValue) => void,
) {
  let calendar: CalendarContextValue | undefined;
  const dispose = createRoot((dispose) => {
    realise(
      render(() => {
        calendar = useCalendarContext();
        return null;
      }),
    );
    if (calendar) observe?.(calendar);
    return dispose;
  });
  flush();
  if (!calendar) throw new Error("The calendar context was not provided");
  return { calendar, dispose };
}

function echoingParent() {
  let setMode: (mode: CalendarViewMode) => unknown = () => {};
  let setDate: (date: Date) => unknown = () => {};
  let changedMode: CalendarViewMode | undefined;
  let changedCurrentDate: Date | undefined;
  const frames: string[] = [];
  let mode: () => CalendarViewMode = () => "week";
  const { calendar, dispose } = mount(
    (capture) => {
      const [currentMode, updateMode] = createSignal<CalendarViewMode>("week");
      const [date, updateDate] = createSignal(initialDate);
      mode = currentMode;
      setMode = updateMode;
      setDate = updateDate;
      const Capture = capture;
      return (
        <CalendarProvider
          events={() => []}
          viewMode={currentMode()}
          currentDate={date()}
          onViewModeChange={(mode) => {
            changedMode = mode;
            updateMode(mode);
          }}
          onCurrentDateChange={(date) => {
            changedCurrentDate = date;
            updateDate(date);
          }}
        >
          <Capture />
        </CalendarProvider>
      );
    },
    (calendar) => {
      // A reader of both the parent's state and the calendar must never see them disagree.
      createEffect(
        () => `${mode()}:${calendar.viewMode()}`,
        (frame) => {
          frames.push(frame);
        },
      );
    },
  );
  try {
    equal(calendar.viewMode(), "week", "controlled calendar starts in the supplied view");
    equal(
      time(calendar.currentDate()),
      time(initialDate),
      "controlled calendar starts on the date",
    );
    setMode("month");
    setDate(changedDate);
    flush();
    equal(calendar.viewMode(), "month", "parent view changes reach the calendar");
    equal(
      time(calendar.currentDate()),
      time(changedDate),
      "parent date changes reach the calendar",
    );
    equal(
      frames.join(),
      "week:week,month:month",
      "controlled props reach the calendar in the same flush",
    );
    calendar.setViewMode("day");
    flush();
    calendar.goToNext();
    flush();
    equal(changedMode, "day", "view callbacks run after interaction");
    equal(
      time(changedCurrentDate),
      new Date(2026, 9, 22).getTime(),
      "navigation follows the updated day view after flush",
    );
    equal(time(calendar.currentDate()), new Date(2026, 9, 22).getTime(), "echoed date is shown");
  } finally {
    dispose();
  }
}

function ignoringParent() {
  let setMode: (mode: CalendarViewMode) => unknown = () => {};
  const requestedModes: CalendarViewMode[] = [];
  const requestedDates: Date[] = [];
  const { calendar, dispose } = mount((capture) => {
    const [mode, updateMode] = createSignal<CalendarViewMode>("week");
    setMode = updateMode;
    const Capture = capture;
    return (
      <CalendarProvider
        events={() => []}
        viewMode={mode()}
        currentDate={initialDate}
        onViewModeChange={(mode) => requestedModes.push(mode)}
        onCurrentDateChange={(date) => requestedDates.push(date)}
      >
        <Capture />
      </CalendarProvider>
    );
  });
  try {
    calendar.setViewMode("day");
    calendar.goToNext();
    flush();
    equal(requestedModes.join(), "day", "a controlled view change is requested");
    equal(time(requestedDates[0]), new Date(2026, 9, 14).getTime(), "navigation is requested");
    equal(calendar.viewMode(), "week", "an ignored view request leaves the controlled view");
    equal(time(calendar.currentDate()), time(initialDate), "an ignored date request is not shown");
    calendar.goToNext();
    flush();
    equal(
      time(requestedDates[1]),
      new Date(2026, 9, 14).getTime(),
      "navigation keeps starting from the controlled date",
    );
    setMode("month");
    flush();
    equal(calendar.viewMode(), "month", "the parent can still change the controlled view");
  } finally {
    dispose();
  }
}

function uncontrolled() {
  let setDefaultMode: (mode: CalendarViewMode) => unknown = () => {};
  let setWeekStart: (day: 0 | 1) => unknown = () => {};
  const requestedModes: CalendarViewMode[] = [];
  const { calendar, dispose } = mount((capture) => {
    const [defaultMode, updateDefaultMode] = createSignal<CalendarViewMode>("month");
    const [weekStart, updateWeekStart] = createSignal<0 | 1>(1);
    setDefaultMode = updateDefaultMode;
    setWeekStart = updateWeekStart;
    const Capture = capture;
    return (
      <CalendarProvider
        events={() => []}
        defaultViewMode={defaultMode()}
        defaultDate={initialDate}
        weekStartsOn={weekStart()}
        onViewModeChange={(mode) => requestedModes.push(mode)}
      >
        <Capture />
      </CalendarProvider>
    );
  });
  try {
    equal(calendar.viewMode(), "month", "the default view seeds an uncontrolled calendar");
    setDefaultMode("day");
    flush();
    equal(calendar.viewMode(), "month", "later default changes do not reset the view");
    calendar.setViewMode("week");
    flush();
    equal(calendar.viewMode(), "week", "an uncontrolled calendar keeps its own view");
    equal(requestedModes.join(), "week", "uncontrolled changes are still reported");
    // 7 October 2026 is a Wednesday.
    equal(time(calendar.startDate()), new Date(2026, 9, 5).getTime(), "weeks start on Monday");
    setWeekStart(0);
    flush();
    equal(time(calendar.startDate()), new Date(2026, 9, 4).getTime(), "the week start is reactive");
    calendar.goToNext();
    flush();
    equal(time(calendar.currentDate()), new Date(2026, 9, 14).getTime(), "navigation moves on");
  } finally {
    dispose();
  }
}

export default function runCalendarContextSpec() {
  const reports: unknown[][] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => reports.push(args);
  console.error = (...args: unknown[]) => reports.push(args);
  try {
    echoingParent();
    ignoringParent();
    uncontrolled();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  equal(reports.map(String).join("\n"), "", "the calendar emits no native warnings or errors");
  console.log("PASS calendar context: controlled, ignored and uncontrolled state");
}

if (import.meta.main) runCalendarContextSpec();
