"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  id: string | null;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
};

type CalendarData = {
  generatedAt: string | null;
  calendar: string;
  eventCount: number;
  events: CalendarEvent[];
};

function formatEventDate(event: CalendarEvent) {
  if (!event.start) {
    return {
      day: "--",
      date: "--",
      time: "--",
    };
  }

  if (event.allDay) {
    const [year, month, day] =
      event.start.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return {
      day: date
        .toLocaleDateString("en-US", {
          weekday: "short",
        })
        .toUpperCase(),

      date: date
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        .toUpperCase(),

      time: "ALL DAY",
    };
  }

  const date = new Date(event.start);

  return {
    day: date
      .toLocaleDateString("en-US", {
        timeZone: "America/Phoenix",
        weekday: "short",
      })
      .toUpperCase(),

    date: date
      .toLocaleDateString("en-US", {
        timeZone: "America/Phoenix",
        month: "short",
        day: "numeric",
      })
      .toUpperCase(),

    time: date.toLocaleTimeString(
      "en-US",
      {
        timeZone: "America/Phoenix",
        hour: "numeric",
        minute: "2-digit",
      }
    ),
  };
}

export default function UpcomingEvents() {
  const [calendar, setCalendar] =
    useState<CalendarData | null>(null);

  useEffect(() => {
    async function loadCalendar() {
      try {
        const response = await fetch(
          "/api/calendar",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Calendar request failed: ${response.status}`
          );
        }

        const data = await response.json();

        setCalendar(data);
      } catch (error) {
        console.error(
          "Calendar fetch failed:",
          error
        );
      }
    }

    loadCalendar();

    const timer = setInterval(
      loadCalendar,
      60000
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  const events =
    calendar?.events.slice(0, 3) ?? [];

  return (
    <div className="mt-8 rounded-xl border-2 border-orange-500 bg-black/40 p-6">

      <div className="flex items-center justify-between gap-4">

        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-orange-500">
            Home Ops Calendar
          </div>

          <div className="mt-1 text-3xl font-bold text-orange-200">
            UPCOMING
          </div>
        </div>

        <div className="text-sm uppercase tracking-[0.2em] text-cyan-300">
          {calendar
            ? `${calendar.eventCount} EVENT${
                calendar.eventCount === 1
                  ? ""
                  : "S"
              }`
            : "LOADING"}
        </div>

      </div>

      <div className="mt-6 border-t border-orange-800">

        {!calendar ? (
          <div className="py-6 text-orange-200">
            Loading calendar...
          </div>
        ) : events.length === 0 ? (
          <div className="py-6 text-orange-200">
            No upcoming Home Ops events.
          </div>
        ) : (
          events.map((event, index) => {
            const formatted =
              formatEventDate(event);

            return (
              <div
                key={
                  event.id ??
                  `${event.title}-${index}`
                }
                className="grid gap-4 border-b border-orange-900 py-5 md:grid-cols-[130px_1fr_140px] md:items-center"
              >

                <div>
                  <div className="text-sm font-bold text-cyan-300">
                    {formatted.day}
                  </div>

                  <div className="text-xl font-bold text-orange-300">
                    {formatted.date}
                  </div>
                </div>

                <div>
                  <div
                    className={`font-bold ${
                      index === 0
                        ? "text-2xl text-yellow-300"
                        : "text-xl text-orange-100"
                    }`}
                  >
                    {event.title}
                  </div>

                  {event.location && (
                    <div className="mt-1 text-sm text-cyan-300">
                      {event.location}
                    </div>
                  )}

                  {event.description && (
                    <div className="mt-1 text-sm text-orange-300">
                      {event.description}
                    </div>
                  )}
                </div>

                <div className="text-left md:text-right">
                  <div className="text-xl font-bold text-cyan-300">
                    {formatted.time}
                  </div>

                  {index === 0 && (
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-yellow-300">
                      Next Event
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}

      </div>

    </div>
  );
}
