import {
  addDays,
  addMinutes,
  formatISO,
  isBefore,
  startOfDay,
} from "date-fns";

import type {
  AvailableSlot,
  Booking,
  EventType,
  GuestBookingRequest,
  SlotRow,
} from "../types";

const MS = 180;

async function delay() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MS);
  });
}

const EVENT_TYPES: EventType[] = [
  {
    id: "call-30",
    title: "Звонок 30 минут",
    description:
      "Короткий созвон: вопросы по продукту, демо или уточнение договорённостей.",
    durationMinutes: 30,
  },
  {
    id: "call-60",
    title: "Расширенная консультация",
    description:
      "Час для разбора задачи или онбординга. Доступность как у остальных слотов календаря.",
    durationMinutes: 60,
  },
];

let bookings: Booking[] = [];

function seedBookings(now: Date) {
  const d0 = startOfDay(addDays(now, 1));
  const occupiedStart = addMinutes(d0, 9 * 60);
  bookings = [
    {
      id: "seed-occupied",
      eventTypeId: "call-30",
      startAt: formatISO(occupiedStart),
      endAt: formatISO(addMinutes(occupiedStart, 30)),
      guestDisplayName: "Seed guest",
      guestContact: "seed@example.com",
    },
  ];
}

seedBookings(new Date());

function getGuestWindow(now: Date) {
  const from = startOfDay(now);
  const to = addDays(from, 14);
  return { from, to };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return isBefore(aStart, bEnd) && isBefore(bStart, aEnd);
}

function getEventTypeOrThrow(id: string): EventType {
  const t = EVENT_TYPES.find((e) => e.id === id);
  if (!t) throw new Error("Unknown event type");
  return t;
}

function overlapsAnyBooking(start: Date, end: Date) {
  return bookings.some((b) =>
    overlaps(start, end, new Date(b.startAt), new Date(b.endAt)),
  );
}

/** Potential slot starts within working day [09:00, 18:00) in steps of durationMinutes */
function iterateDaySlots(day: Date, durationMinutes: number): { start: Date; end: Date }[] {
  const dayStart = startOfDay(day);
  const out: { start: Date; end: Date }[] = [];
  for (let minsFromMidnight = 9 * 60; minsFromMidnight + durationMinutes <= 18 * 60; minsFromMidnight += durationMinutes) {
    const start = addMinutes(dayStart, minsFromMidnight);
    const end = addMinutes(start, durationMinutes);
    out.push({ start, end });
  }
  return out;
}

function isDayInGuestWindow(day: Date, window: { from: Date; to: Date }) {
  return !isBefore(day, window.from) && isBefore(day, window.to);
}

export async function mockListGuestEventTypes(): Promise<EventType[]> {
  await delay();
  return EVENT_TYPES.map((e) => ({ ...e }));
}

export async function mockListAvailableSlots(
  eventTypeId: string,
  fromIso: string,
  toIso: string,
): Promise<AvailableSlot[]> {
  await delay();
  const type = getEventTypeOrThrow(eventTypeId);
  const window = getGuestWindow(new Date());
  const fromReq = new Date(fromIso);
  const toReq = new Date(toIso);

  const free: AvailableSlot[] = [];

  let day = startOfDay(fromReq);
  const lastDayExclusive = startOfDay(toReq);

  while (isBefore(day, lastDayExclusive)) {
    if (isDayInGuestWindow(day, window)) {
      const slots = iterateDaySlots(day, type.durationMinutes);
      for (const { start, end } of slots) {
        if (
          +start >= +fromReq &&
          +end <= +toReq &&
          !overlapsAnyBooking(start, end)
        ) {
          free.push({ startAt: formatISO(start), endAt: formatISO(end) });
        }
      }
    }
    day = addDays(day, 1);
  }

  return free;
}

/** All rows for calendar day (free + занято) — UI helper. */
export async function mockListSlotRowsForDay(
  eventTypeId: string,
  day: Date,
): Promise<SlotRow[]> {
  await delay();
  const type = getEventTypeOrThrow(eventTypeId);
  const window = getGuestWindow(new Date());

  if (!isDayInGuestWindow(startOfDay(day), window)) {
    return [];
  }

  return iterateDaySlots(day, type.durationMinutes).map(({ start, end }) => ({
    startAt: formatISO(start),
    endAt: formatISO(end),
    available: !overlapsAnyBooking(start, end),
  }));
}

export async function mockCountAvailableByDayKey(
  eventTypeId: string,
  keys: Set<string>,
): Promise<Map<string, number>> {
  await delay();
  const type = getEventTypeOrThrow(eventTypeId);
  const window = getGuestWindow(new Date());
  const counts = new Map<string, number>();

  for (const key of keys) {
    const parts = key.split("-").map(Number);
    const y = parts[0] ?? NaN;
    const m = parts[1] ?? NaN;
    const dayNum = parts[2] ?? NaN;
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(dayNum)) {
      counts.set(key, 0);
      continue;
    }
    const day = new Date(y, m - 1, dayNum);
    if (!isDayInGuestWindow(day, window)) {
      counts.set(key, 0);
      continue;
    }
    const slots = iterateDaySlots(day, type.durationMinutes);
    let free = 0;
    for (const { start, end } of slots) {
      if (!overlapsAnyBooking(start, end)) free += 1;
    }
    counts.set(key, free);
  }
  return counts;
}

export async function mockCreateBooking(body: GuestBookingRequest): Promise<Booking> {
  await delay();
  const window = getGuestWindow(new Date());
  const type = getEventTypeOrThrow(body.eventTypeId);
  const start = new Date(body.startAt);
  const end = addMinutes(start, type.durationMinutes);

  if (+start < +window.from || +end > +window.to) {
    throw new Error("OUT_OF_WINDOW");
  }
  if (overlapsAnyBooking(start, end)) {
    throw new Error("CONFLICT");
  }

  const booking: Booking = {
    id: `b-${crypto.randomUUID()}`,
    eventTypeId: body.eventTypeId,
    startAt: formatISO(start),
    endAt: formatISO(end),
    guestDisplayName: body.guestDisplayName,
    guestContact: body.guestContact,
  };
  bookings = [...bookings, booking];
  return booking;
}

export async function mockListUpcomingBookings(now: Date): Promise<Booking[]> {
  await delay();
  return bookings.filter((b) => isBefore(now, new Date(b.endAt))).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
}

function syncCountFreeSlotsOnDay(now: Date, eventTypeId: string, day: Date): number {
  const type = getEventTypeOrThrow(eventTypeId);
  const window = getGuestWindow(now);
  const d = startOfDay(day);
  if (!isDayInGuestWindow(d, window)) return 0;
  return iterateDaySlots(d, type.durationMinutes).filter(({ start, end }) => !overlapsAnyBooking(start, end)).length;
}

export function mockSyncCountFreeSlotsOnDay(eventTypeId: string, day: Date) {
  return syncCountFreeSlotsOnDay(new Date(), eventTypeId, day);
}

export function mockGetGuestWindowBounds() {
  return getGuestWindow(new Date());
}

export function mockFindEventType(id: string) {
  return EVENT_TYPES.find((e) => e.id === id) ?? null;
}
