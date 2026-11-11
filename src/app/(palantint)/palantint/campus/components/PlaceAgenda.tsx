"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { fetchPrivate } from "@/lib/api";
import { timetableHref } from "@/lib/timetableContext";

export type AgendaEvent = { id: string; name: string; start_time: string; end_time: string };

const HOUR_PX = 40;
const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const clock = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const pad = (value: number) => String(value).padStart(2, "0");
// Event times are Paris wall-clock (as in ADE): days are compared on local dates.
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (value: string) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };
const shift = (value: string, days: number) => { const date = fromIso(value); date.setDate(date.getDate() + days); return isoDay(date); };
const hours = (date: Date, day: Date) => (date.getTime() - day.getTime()) / 3_600_000;

/** One day of a place's agenda: a compact hourly timeline whose height stays limited. */
export default function PlaceAgenda({ locationId, agendaRoom, upcoming }: { locationId: string; agendaRoom: string; upcoming: AgendaEvent[] }) {
    const today = isoDay(new Date());
    const [day, setDay] = useState(today);
    const [response, setResponse] = useState<{ key: string; events: AgendaEvent[] | null } | null>(null);
    const key = `${locationId}|${day}`;
    const events = response?.key === key ? response.events : undefined;
    const scroller = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        fetchPrivate(`/maps/indoor/locations/${locationId}/events?day=${day}`, { signal: controller.signal })
            .then((data: { events: AgendaEvent[] }) => { if (active) setResponse({ key: `${locationId}|${day}`, events: data.events }); })
            .catch(() => { if (active) setResponse({ key: `${locationId}|${day}`, events: null }); });
        return () => { active = false; controller.abort(); };
    }, [locationId, day]);

    const start = fromIso(day);
    const blocks = useMemo(() => {
        const midnight = fromIso(day);
        const laneEnds: number[] = [];
        return (events || []).map(event => {
            const from = Math.max(0, hours(new Date(event.start_time), midnight));
            const to = Math.min(24, hours(new Date(event.end_time), midnight));
            let lane = laneEnds.findIndex(end => end <= from);
            if (lane < 0) { lane = laneEnds.length; laneEnds.push(to); } else laneEnds[lane] = to;
            return { event, from, to, lane };
        }).map((block, _, all) => ({ ...block, lanes: Math.max(1, ...all.filter(other => other.from < block.to && block.from < other.to).map(other => other.lane + 1)) }));
    }, [events, day]);
    const first = Math.min(8, ...blocks.map(block => Math.floor(block.from)));
    const last = Math.max(20, ...blocks.map(block => Math.ceil(block.to)));
    const now = day === today ? hours(new Date(), start) : null;

    // Open on the first event of the day, or on the current hour today; later scrolling is the reader's.
    useEffect(() => {
        const target = blocks[0]?.from ?? (now !== null && now >= first && now <= last ? now - 1 : null);
        if (scroller.current && target !== null) scroller.current.scrollTop = Math.max(0, (target - first) * HOUR_PX - 8);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    const next = upcoming.map(event => isoDay(new Date(event.start_time))).find(value => value > day);
    const nav = "flex h-8 w-8 items-center justify-center border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400";

    return <div>
        <div className="mb-2 flex items-center gap-2">
            <button onClick={() => setDay(shift(day, -1))} title="Jour précédent" aria-label="Jour précédent" className={nav}><ChevronLeft className="h-4 w-4" /></button>
            <p className="min-w-0 flex-1 truncate text-center text-sm capitalize text-zinc-200" aria-live="polite">{day === today ? "Aujourd’hui" : dayLabel.format(start)}</p>
            <button onClick={() => setDay(shift(day, 1))} title="Jour suivant" aria-label="Jour suivant" className={nav}><ChevronRight className="h-4 w-4" /></button>
        </div>
        {day !== today && <button onClick={() => setDay(today)} className="mb-2 w-full border border-zinc-800 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white">Revenir à aujourd’hui</button>}
        {events === undefined ? <p className="flex items-center gap-2 py-6 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement de l’agenda…</p>
            : events === null ? <p className="py-4 text-sm text-zinc-500">Agenda indisponible pour le moment.</p>
            : !events.length ? <div className="py-4 text-sm text-zinc-500">
                <p>Aucun événement ce jour.</p>
                {next && <button onClick={() => setDay(next)} className="mt-2 text-timetable-400 hover:text-white">Prochain : {shortDay.format(fromIso(next))}</button>}
            </div>
            : <div ref={scroller} className="max-h-56 overflow-y-auto border border-zinc-800/80">
                <div className="relative" style={{ height: (last - first) * HOUR_PX }}>
                    {Array.from({ length: last - first }, (_, index) => <div key={index} className="absolute inset-x-0 border-t border-zinc-800/70" style={{ top: index * HOUR_PX }}>
                        <span className="absolute left-1 top-0.5 font-mono text-[9px] text-zinc-600">{pad(first + index)}:00</span>
                    </div>)}
                    {blocks.map(({ event, from, to, lane, lanes }) => <Link key={event.id} href={timetableHref({ room: agendaRoom, week: start })} title={`${event.name} · ${clock.format(new Date(event.start_time))}–${clock.format(new Date(event.end_time))}`}
                        className="absolute overflow-hidden border border-l-2 border-zinc-800 border-l-timetable-400 bg-zinc-900 px-1.5 py-0.5 text-[11px] leading-tight text-zinc-100 hover:bg-zinc-800"
                        style={{ top: (from - first) * HOUR_PX + 1, height: Math.max(18, (to - from) * HOUR_PX - 2), left: `calc(40px + (100% - 44px) * ${lane / lanes})`, width: `calc((100% - 44px) / ${lanes})` }}>
                        <span className="block font-mono text-[9px] text-timetable-300">{clock.format(new Date(event.start_time))}–{clock.format(new Date(event.end_time))}</span>
                        <span className="line-clamp-2">{event.name}</span>
                    </Link>)}
                    {now !== null && now > first && now < last && <div aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-comms-400" style={{ top: (now - first) * HOUR_PX }} />}
                </div>
            </div>}
    </div>;
}
