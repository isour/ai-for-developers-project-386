import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";

import type { Booking } from "@/shared/api/types";
import { guestApi } from "@/shared/api/guest-api";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function UpcomingEventsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);

  useEffect(() => {
    let alive = true;
    void guestApi.listUpcomingBookings().then((list) => {
      if (!alive) return;
      setItems(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Предстоящие события</h1>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Пока нет активных записей. Оформите бронирование через «Записаться».
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((b) => {
            const start = parseISO(b.startAt);
            const slotText = `${format(start, "yyyy-MM-dd HH:mm")} – ${format(parseISO(b.endAt), "HH:mm")}`;
            return (
              <Card key={b.id} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="text-base font-semibold">
                    {b.guestDisplayName?.trim() || `Гость (${b.eventTypeId})`}
                  </div>
                  {b.guestContact?.trim() ? (
                    <div className="text-sm text-muted-foreground">{b.guestContact}</div>
                  ) : (
                    <div className="text-sm italic text-muted-foreground">контакт не указан</div>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Слот: </span>
                    <span className="font-medium">{slotText}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Начало: </span>
                    <span>{format(start, "d MMMM yyyy, HH:mm", { locale: ru })}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
