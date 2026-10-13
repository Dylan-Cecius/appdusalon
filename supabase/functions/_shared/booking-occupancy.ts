export type BookingServiceTiming = {
  duration?: number | null;
  appointment_buffer?: number | null;
};

export type BookingStepTiming = {
  position?: number | null;
  step_type?: string | null;
  duration_minutes?: number | null;
};

export type BookingOccupancyRange = {
  startOffsetMinutes: number;
  endOffsetMinutes: number;
};

export const buildBookingOccupancy = (
  service: BookingServiceTiming,
  steps: BookingStepTiming[] | null | undefined
): {
  totalMinutes: number;
  occupiedRanges: BookingOccupancyRange[];
} => {
  const orderedSteps = [...(steps || [])]
    .filter((step) => Number(step.duration_minutes || 0) > 0)
    .sort(
      (a, b) => Number(a.position || 0) - Number(b.position || 0)
    );

  const occupiedRanges: BookingOccupancyRange[] = [];
  let cursor = 0;

  if (orderedSteps.length > 0) {
    for (const step of orderedSteps) {
      const duration = Math.max(1, Number(step.duration_minutes || 0));
      const start = cursor;
      const end = cursor + duration;

      if (String(step.step_type || "work") !== "pause") {
        occupiedRanges.push({
          startOffsetMinutes: start,
          endOffsetMinutes: end,
        });
      }

      cursor = end;
    }

    // Fail safe: a malformed all-pause service must never make the staff member
    // appear completely free for the whole customer appointment.
    if (occupiedRanges.length === 0 && cursor > 0) {
      occupiedRanges.push({
        startOffsetMinutes: 0,
        endOffsetMinutes: cursor,
      });
    }
  } else {
    const duration = Math.max(5, Number(service.duration || 30));
    occupiedRanges.push({
      startOffsetMinutes: 0,
      endOffsetMinutes: duration,
    });
    cursor = duration;
  }

  const buffer = Math.max(0, Number(service.appointment_buffer || 0));
  if (buffer > 0) {
    occupiedRanges.push({
      startOffsetMinutes: cursor,
      endOffsetMinutes: cursor + buffer,
    });
    cursor += buffer;
  }

  return {
    totalMinutes: Math.max(5, cursor),
    occupiedRanges,
  };
};

export const rangesOverlap = (
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) => firstStart < secondEnd && firstEnd > secondStart;
