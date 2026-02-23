import { format } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-solid";
import { Button } from "../forms/button";
import { useCalendarContext } from "./calendar-context";

export function CalendarHeaderNav() {
  const { viewMode, currentDate, startDate, endDate, goToPrev, goToNext } =
    useCalendarContext();

  const displayText = () => {
    const mode = viewMode();
    if (mode === "day") {
      return format(currentDate(), "EEEE, d MMMM yyyy");
    }
    if (mode === "week") {
      return `${format(startDate(), "MMM d")} - ${format(endDate(), "MMM d, yyyy")}`;
    }
    return format(currentDate(), "MMMM yyyy");
  };

  return (
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        class="h-7 w-7 p-0"
        onClick={goToPrev}
      >
        <ArrowLeft size={14} />
      </Button>

      <span class="min-w-[180px] text-center font-medium text-sm text-gray-700">
        {displayText()}
      </span>

      <Button
        variant="outline"
        size="sm"
        class="h-7 w-7 p-0"
        onClick={goToNext}
      >
        <ArrowRight size={14} />
      </Button>
    </div>
  );
}
