import { createRoot, createSignal, flush } from "solid-js";
import {
  CalendarProvider,
  useCalendarContext,
  type CalendarContextValue,
  type CalendarProviderProps,
} from "../src/calendar/calendar-context";
import type { CalendarViewMode } from "../src/calendar/types";

function realise(value: unknown): void {
  if (typeof value === "function") realise(value());
  else if (Array.isArray(value)) value.forEach(realise);
}
function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
}
function ControlledCalendar(props: CalendarProviderProps) {
  return (
    <CalendarProvider
      events={props.events}
      viewMode={props.viewMode === undefined ? undefined : props.viewMode}
      currentDate={props.currentDate}
      onViewModeChange={props.onViewModeChange}
      onCurrentDateChange={props.onCurrentDateChange}
    >
      {props.children}
    </CalendarProvider>
  );
}
export default function runCalendarContextSpec() {
  let calendar: CalendarContextValue | undefined;
  let setMode: (mode: CalendarViewMode) => unknown = () => {};
  let setDate: (date: Date) => unknown = () => {};
  let tree: unknown;
  const initialDate = new Date(2026, 9, 7);
  const changedDate = new Date(2026, 9, 21);
  let changedMode: CalendarViewMode | undefined;
  let changedCurrentDate: Date | undefined;
  const Capture = () => {
    calendar = useCalendarContext();
    return null;
  };
  const dispose = createRoot((dispose) => {
    const [mode, updateMode] = createSignal<CalendarViewMode>("week");
    setMode = updateMode;
    const [date, updateDate] = createSignal(initialDate);
    setDate = updateDate;
    tree = (
      <ControlledCalendar
        events={() => []}
        viewMode={mode()}
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
      </ControlledCalendar>
    );
    return dispose;
  });
  try {
    realise(tree);
    flush();
    equal(calendar?.viewMode(), "week", "controlled calendar starts in the supplied view");
    equal(
      calendar?.currentDate().getTime(),
      initialDate.getTime(),
      "controlled calendar starts on the supplied date",
    );
    setMode("month");
    setDate(changedDate);
    flush();
    equal(calendar?.viewMode(), "month", "parent view changes reach the calendar");
    equal(
      calendar?.currentDate().getTime(),
      changedDate.getTime(),
      "parent date changes reach the calendar",
    );
    calendar?.setViewMode("day");
    flush();
    calendar?.goToNext();
    flush();
    equal(changedMode, "day", "view callbacks run after interaction");
    equal(
      changedCurrentDate?.getTime(),
      new Date(2026, 9, 22).getTime(),
      "navigation follows the updated day view after flush",
    );
    console.log("PASS controlled calendar owner setup, updates and navigation");
  } finally {
    dispose();
  }
}

if (import.meta.main) runCalendarContextSpec();
