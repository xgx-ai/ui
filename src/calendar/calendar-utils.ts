import {
  addDays,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  startOfDay,
} from "date-fns";
import type { CalendarEvent, LayoutedEvent } from "./types";

export function isAllDayEvent(event: {
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
}): boolean {
  if (event.isAllDay) return true;
  if (!event.endDate) return false;
  const duration = differenceInMinutes(event.endDate, event.startDate);
  return (
    duration >= 24 * 60 &&
    event.startDate.getHours() === 0 &&
    event.startDate.getMinutes() === 0
  );
}

export function isHeaderEvent(event: {
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
}): boolean {
  const eventEnd = event.endDate || addMinutes(event.startDate, 30);
  const isMultiDay = !isSameDay(event.startDate, eventEnd);
  const isAllDay = isAllDayEvent(event);
  return isMultiDay || isAllDay;
}

export function layoutHeaderEvents(
  events: CalendarEvent[],
  day: Date,
  allWeekEvents: CalendarEvent[],
): Array<LayoutedEvent & { absoluteTop: number }> {
  const weekHeaderEvents = allWeekEvents.filter((event) =>
    isHeaderEvent(event),
  );
  weekHeaderEvents.sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  const lanes: { endDate: Date; eventId: string }[] = [];
  const eventLanes = new Map<string, number>();

  for (const event of weekHeaderEvents) {
    const eventEnd = event.endDate || addMinutes(event.startDate, 24 * 60);
    let assignedLane = -1;

    for (let i = 0; i < lanes.length; i++) {
      if (event.startDate >= lanes[i].endDate) {
        assignedLane = i;
        lanes[i] = { endDate: eventEnd, eventId: event.id };
        break;
      }
    }

    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push({ endDate: eventEnd, eventId: event.id });
    }

    eventLanes.set(event.id, assignedLane);
  }

  const totalLanes = lanes.length;
  const dayHeaderEvents = events.filter((event) => isHeaderEvent(event));

  return dayHeaderEvents.map((event) => {
    const eventEnd = event.endDate || addMinutes(event.startDate, 24 * 60);
    const lane = eventLanes.get(event.id) || 0;
    const isFirstDay = isSameDay(event.startDate, day);
    const isLastDay =
      isSameDay(eventEnd, day) || eventEnd <= addDays(startOfDay(day), 1);
    const laneHeight = 20;
    const laneSpacing = 4;
    const top = lane * (laneHeight + laneSpacing);

    return {
      event,
      top: 0,
      height: laneHeight,
      left: 0,
      width: 100,
      colIndex: 0,
      totalColumns: 1,
      isMultiDay: true,
      isAllDay: isAllDayEvent(event),
      lane,
      isFirstDay,
      isLastDay,
      totalLanes,
      absoluteTop: top,
    };
  });
}

export function layoutSingleDayEvents(
  events: CalendarEvent[],
  day: Date,
  _multiDayLaneCount: number,
): Array<LayoutedEvent> {
  const dayStart = startOfDay(day);

  const layoutEvents = events.map((event) => {
    const startMinutes = differenceInMinutes(event.startDate, dayStart);
    const endMinutes = event.endDate
      ? differenceInMinutes(event.endDate, dayStart)
      : startMinutes + 30;
    const top = (startMinutes / (24 * 60)) * 100;
    const height = Math.max(((endMinutes - startMinutes) / (24 * 60)) * 100, 1);

    return {
      event,
      startMinutes,
      endMinutes,
      top,
      height,
      colIndex: 0,
      totalColumns: 1,
    };
  });

  layoutEvents.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes);
  });

  const columns: Array<{ endMinutes: number }> = [];
  for (const event of layoutEvents) {
    let colIndex = 0;
    for (let i = 0; i < columns.length; i++) {
      if (event.startMinutes >= columns[i].endMinutes) {
        colIndex = i;
        break;
      }
      colIndex = i + 1;
    }
    while (columns.length <= colIndex) {
      columns.push({ endMinutes: 0 });
    }
    columns[colIndex].endMinutes = event.endMinutes;
    event.colIndex = colIndex;
  }

  const overlappingGroups: Array<typeof layoutEvents> = [];
  let currentGroup: typeof layoutEvents = [];
  for (const event of layoutEvents) {
    if (currentGroup.length === 0) {
      currentGroup = [event];
      continue;
    }
    const lastInGroup = currentGroup[currentGroup.length - 1];
    const hasOverlap = event.startMinutes < lastInGroup.endMinutes;
    if (hasOverlap) {
      currentGroup.push(event);
    } else {
      overlappingGroups.push([...currentGroup]);
      currentGroup = [event];
    }
  }
  if (currentGroup.length > 0) {
    overlappingGroups.push(currentGroup);
  }

  for (const group of overlappingGroups) {
    const maxColumns = Math.max(...group.map((e) => e.colIndex)) + 1;
    for (const event of group) {
      event.totalColumns = maxColumns;
    }
  }

  return layoutEvents.map((event) => ({
    event: event.event,
    top: event.top,
    height: event.height,
    left: (event.colIndex / event.totalColumns) * 100,
    width: 100 / event.totalColumns,
    colIndex: event.colIndex,
    totalColumns: event.totalColumns,
    isMultiDay: false,
    lane: 0,
    isFirstDay: true,
    isLastDay: true,
    totalLanes: 1,
  }));
}

export function layoutEvents(
  events: CalendarEvent[],
  day: Date,
  allWeekEvents: CalendarEvent[],
): Array<LayoutedEvent> {
  const headerEvents = layoutHeaderEvents(events, day, allWeekEvents);
  const singleDayEvents = events.filter((event) => !isHeaderEvent(event));
  const singleDayLayout = layoutSingleDayEvents(
    singleDayEvents,
    day,
    headerEvents.length,
  );
  return [...headerEvents, ...singleDayLayout];
}
