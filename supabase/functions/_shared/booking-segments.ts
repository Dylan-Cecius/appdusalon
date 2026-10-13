export type BookingServiceStep = {
  step_type: "work" | "pause" | "cleanup";
  duration_minutes: number;
};

export type BookingOccupancySegment = {
  start: Date;
  end: Date;
  occupiesStaff: boolean;
};

export const buildBookingSegments = ({
  start,
  serviceDurationMinutes,
  appointmentBufferMinutes,
  steps,
}: {
  start: Date;
  serviceDurationMinutes: number;
  appointmentBufferMinutes: number;
  steps: BookingServiceStep[];
}): {
  totalDurationMinutes: number;
  segments: BookingOccupancySegment[];
  occupiedSegments: BookingOccupancySegment[];
} => {
  const normalizedSteps = (steps || []).filter(
    (step) =>
      ["work", "pause", "cleanup"].includes(step.step_type) &&
      Number.isFinite(Number(step.duration_minutes)) &&
      Number(step.duration_minutes) > 0
  );

  const segments: BookingOccupancySegment[] = [];
  let cursor = new Date(start);

  if (normalizedSteps.length > 0) {
    for (const step of normalizedSteps) {
      const duration = Math.max(1, Number(step.duration_minutes));
      const end = new Date(cursor.getTime() + duration * 60_000);

      segments.push({
        start: new Date(cursor),
        end,
        occupiesStaff: step.step_type !== "pause",
      });

      cursor = end;
    }
  } else {
    const duration = Math.max(5, Number(serviceDurationMinutes || 30));
    const end = new Date(cursor.getTime() + duration * 60_000);

    segments.push({
      start: new Date(cursor),
      end,
      occupiesStaff: true,
    });

    cursor = end;
  }

  const buffer = Math.max(0, Number(appointmentBufferMinutes || 0));
  if (buffer > 0) {
    const end = new Date(cursor.getTime() + buffer * 60_000);
    segments.push({
      start: new Date(cursor),
      end,
      occupiesStaff: true,
    });
    cursor = end;
  }

  const totalDurationMinutes = Math.round(
    (cursor.getTime() - start.getTime()) / 60_000
  );

  return {
    totalDurationMinutes,
    segments,
    occupiedSegments: segments.filter((segment) => segment.occupiesStaff),
  };
};

export const bookingSegmentsConflict = (
  candidate: BookingOccupancySegment[],
  existing: Array<{ starts_at: string; ends_at: string }>
) =>
  candidate.some((segment) =>
    existing.some((row) => {
      const existingStart = new Date(row.starts_at);
      const existingEnd = new Date(row.ends_at);
      return segment.start < existingEnd && segment.end > existingStart;
    })
  );
