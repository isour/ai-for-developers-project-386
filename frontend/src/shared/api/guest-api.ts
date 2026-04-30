import type { Booking, EventType, GuestBookingRequest } from "./types";

import {
  mockCountAvailableByDayKey,
  mockCreateBooking,
  mockFindEventType,
  mockGetGuestWindowBounds,
  mockListAvailableSlots,
  mockListGuestEventTypes,
  mockListSlotRowsForDay,
  mockListUpcomingBookings,
  mockSyncCountFreeSlotsOnDay,
} from "./mock/guest-mock-store";

/**
 * Thin facade — swap для fetch к реальному API / Prism.
 */
export const guestApi = {
  listEventTypes: (): Promise<EventType[]> => mockListGuestEventTypes(),

  listAvailableSlots: (
    eventTypeId: string,
    fromIso: string,
    toIso: string,
  ) => mockListAvailableSlots(eventTypeId, fromIso, toIso),

  listSlotRowsForDay: (eventTypeId: string, day: Date) =>
    mockListSlotRowsForDay(eventTypeId, day),

  countAvailableForMonthKeys: (eventTypeId: string, keys: Set<string>) =>
    mockCountAvailableByDayKey(eventTypeId, keys),

  createBooking: (body: GuestBookingRequest): Promise<Booking> =>
    mockCreateBooking(body),

  listUpcomingBookings: (now?: Date) =>
    mockListUpcomingBookings(now ?? new Date()),

  /** Синхронные хелперы мок-слоя (без HTTP). */
  getGuestWindowBounds: () => mockGetGuestWindowBounds(),

  getEventTypeById: (id: string) => mockFindEventType(id),

  /** Синхронный подсчёт для UI без задержки мок-запроса. */
  syncCountFreeSlotsOnDay: (eventTypeId: string, day: Date) => mockSyncCountFreeSlotsOnDay(eventTypeId, day),
};
