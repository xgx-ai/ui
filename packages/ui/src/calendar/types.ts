export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  colour?: string;
  isCompleted?: boolean;
  isAllDay?: boolean;
  data?: unknown;
}

export interface LayoutedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  colIndex: number;
  totalColumns: number;
  isMultiDay: boolean;
  lane: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  totalLanes: number;
  isAllDay?: boolean;
  absoluteTop?: number;
}

export interface ProcessedEvent extends CalendarEvent {
  daySpan: number;
  weekRow: number;
  dayOffset: number;
  slotIndex: number;
}

export interface RenderableEvent extends ProcessedEvent {
  shouldRender: boolean;
}

export type CalendarViewMode = "day" | "week" | "month";

export interface EventMoveData {
  event: CalendarEvent;
  startDate: Date;
  endDate: Date;
}

export interface EventResizeData {
  event: CalendarEvent;
  startDate: Date;
  endDate: Date;
}

export interface SlotClickData {
  date: Date;
  endDate: Date;
}
