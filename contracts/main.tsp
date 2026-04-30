/** HTTP API календаря звонков: **REST** поверх HTTP — коллекции и экземпляры по существительным, глаголы через методы HTTP. Админ: `/owner/...`, гость: `/guest/...`. */
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Rest;

@service(#{
  title: "Календарь звонков API",
})
@OpenAPI.tagMetadata(
  "owner",
  #{ description: "Админская часть: типы событий и список бронирований.", },
)
@OpenAPI.tagMetadata(
  "guest",
  #{ description: "Публичные операции без входа в систему.", },
)
@OpenAPI.info(#{
  version: "1.0.0",
  summary: """
    Без регистрации и авторизации по учётным записям. Владелец — один профиль админской части;
    гость бронирует слот публично. Окно гостевой записи по умолчанию — 14 дней от текущей даты;
    два бронирования не могут пересекаться по времени, даже при разных типах событий.
    Стиль: **REST** (ресурсы, множественное число в путях коллекций, при необходимости субресурсы).
    Привязка маршрутов описана через **@typespec/http** совместно с библиотекой **@typespec/rest** (общие соглашения и расширяемость).
    """,
})
@server("https://localhost", "Пример локального сервера")
namespace CallCalendar {

/** Детали ошибки в теле ответа. */
model Problem {
  /** Краткий код причины (по желанию стабильное имя приложения). */
  code?: string;

  /** Пояснение для человека или клиента. */
  message: string;
}

@error
model NotFound {
  @statusCode _: 404;
  ...Problem;
}

@error
model Conflict {
  @statusCode _: 409;
  ...Problem;
}

@error
model Unprocessable {
  @statusCode _: 422;
  ...Problem;
}

@error
model BadRequest {
  @statusCode _: 400;
  ...Problem;
}

/** Тип события (шаблон встречи), задаётся владельцем. */
model EventType {
  /** Стабильный идентификатор (напр. slug или UUID строкой). */
  id: string;

  title: string;
  description: string;

  /** Длительность встречи в минутах; задаёт размер интервала бронирования. */
  @minValue(1)
  @maxValue(1440)
  durationMinutes: int32;
}

model EventTypeCreate {
  id: string;
  title: string;
  description: string;

  @minValue(1)
  @maxValue(1440)
  durationMinutes: int32;
}

model EventTypeUpdate {
  title?: string;
  description?: string;

  /** При смене длительности реализации следует решить судьбу существующих бронирований. */
  @minValue(1)
  @maxValue(1440)
  durationMinutes?: int32;
}

/** Интервал свободного слота `[startAt, endAt)`. */
model AvailableSlot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

/** Подтверждённое бронирование. */
model Booking {
  id: string;
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;

  /** Необязательная метка гостя (имя, как обращаться на созвоне). */
  guestDisplayName?: string;

  /** Необязательный контакт — без верификации аккаунта. */
  guestContact?: string;
}

model GuestBookingRequest {
  eventTypeId: string;

  /** Начало брони; конец выводится как startAt + durationMinutes типа (проверка на сервере). */
  startAt: utcDateTime;

  guestDisplayName?: string;
  guestContact?: string;
}

@route("/owner/event-types")
@tag("owner")
interface OwnerEventTypes {
  /** Список всех типов событий. */
  @get
  list(): EventType[];

  /** Создать тип события (`POST` по коллекции). */
  @post
  create(@body body: EventTypeCreate): EventType | Conflict | BadRequest;
}

/** Один ресурс типа события. */
@route("/owner/event-types/{eventTypeId}")
@tag("owner")
interface OwnerEventTypeResource {
  @get
  get(@path eventTypeId: string): EventType | NotFound;

  @patch
  update(@path eventTypeId: string, @body body: EventTypeUpdate): EventType | NotFound | Conflict;

  @delete
  remove(@path eventTypeId: string): void | NotFound | Conflict;
}

@route("/owner/bookings")
@tag("owner")
interface OwnerBookings {
  /** Бронирования всех типов в окне времени `[from, to)`. */
  @get
  list(
    /** Начало окна (UTC). */
    @query from: utcDateTime,
    /** Конец окна (UTC), не включается. */
    @query to: utcDateTime,
  ): Booking[] | BadRequest;
}

@route("/guest/event-types")
@tag("guest")
interface GuestEventTypes {
  /** Карточки типов событий для выбора бронирования. */
  @get
  list(): EventType[];
}

/** Субресурс доступных интервалов внутри типа события. */
@route("/guest/event-types/{eventTypeId}/available-slots")
@tag("guest")
interface GuestSlots {
  /**
   * Свободные слоты для типа события на полуинтервале `[from, to)`.
   * Запросы вне гостевого окна (14 дней от «сегодня» на сервере) — `422`.
   */
  @get
  list(
    @path eventTypeId: string,
    @query from: utcDateTime,
    @query to: utcDateTime,
  ): AvailableSlot[] | NotFound | Unprocessable | BadRequest;
}

@route("/guest/bookings")
@tag("guest")
interface GuestBookings {
  /** Создать бронирование на свободный слот. */
  @post
  create(@body body: GuestBookingRequest): Booking | Conflict | Unprocessable | NotFound | BadRequest;
}
}
