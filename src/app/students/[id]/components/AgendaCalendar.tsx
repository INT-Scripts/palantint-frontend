"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { X, Users, Search, MapPin, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import EventDetailsModal from "@/components/EventDetailsModal";

interface AgendaCalendarProps {
    studentId: string;
    themeColor: string;
}

export default function AgendaCalendar({ studentId, themeColor }: AgendaCalendarProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentDate, setCurrentDate] = useState(new Date());

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        // Fetch current week
        const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const end = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");

        fetchAPI(`/students/${studentId}/agenda?start_date=${start}&end_date=${end}`)
            .then(data => setEvents(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [studentId, currentDate]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)); // Mon-Sun

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(parseISO(e.start_time), day));
    };

    return (
        <div className="h-full flex flex-col">
        <div className="h-full flex flex-col pt-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: themeColor }} />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Timetable
                    </h2>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, -7))}
                        className="p-1 px-3 bg-zinc-900 border border-zinc-700 font-mono font-bold hover:text-white transition-colors flex items-center justify-center"
                        style={{ color: themeColor }}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs uppercase tracking-widest text-zinc-300 bg-zinc-950 px-3 py-1 border border-zinc-800">
                        {format(weekStart, "dd MMM")} // {format(addDays(weekStart, 6), "dd MMM, yyyy")}
                    </span>
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, 7))}
                        className="p-1 px-3 bg-zinc-900 border border-zinc-700 font-mono font-bold hover:text-white transition-colors flex items-center justify-center"
                        style={{ color: themeColor }}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-2 border-zinc-800 border-t-zinc-400 animate-spin" />
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center text-red-500 font-mono uppercase tracking-widest text-xs">
                    ACCESS DENIED: {error}
                </div>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar flex bg-zinc-950/80 border border-zinc-800 relative group shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                    {/* Time Gutter */}
                    <div className="w-16 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 pt-[60px] relative z-10">
                        {Array.from({ length: 13 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[90px] border-b border-zinc-800/40 flex items-start justify-center text-[10px] text-zinc-500 font-mono tracking-widest"
                                style={{ height: '90px' }}
                            >
                                <span className="-mt-2.5 bg-zinc-900 px-1 border border-zinc-800/50">{String(i + 8).padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Days Columns Container */}
                    <div className="flex-1 flex min-w-[750px] relative">
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 m-2 pointer-events-none z-30" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 m-2 pointer-events-none z-30" />
                        
                        {days.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <div key={i} className={`flex-1 flex flex-col min-w-[150px] border-r border-zinc-800/50 last:border-0 relative`} style={{ backgroundColor: isToday ? `${themeColor}05` : undefined }}>
                                    {/* Day Header - Sticky Top */}
                                    <div 
                                        className={`text-center py-2 border-b sticky top-0 z-20 h-[60px] flex flex-col justify-center transition-colors`}
                                        style={{ 
                                            backgroundColor: isToday ? '#18181b' : '#18181b', // zinc-900
                                            borderColor: isToday ? `${themeColor}50` : '#27272a' // zinc-800
                                        }}
                                    >
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{format(day, "EEEE")}</p>
                                        <p className={`text-sm font-black font-mono tracking-wider`} style={{ color: isToday ? themeColor : "#d4d4d8" }}>
                                            {format(day, "dd MMM")}
                                        </p>
                                    </div>

                                    {/* Day Grid Lines & Events (starts from 08:00) */}
                                    <div className="relative w-full" style={{ height: `${13 * 90}px` /* 13 hours * 90px */ }}>
                                        {/* Horizontal grid lines */}
                                        {Array.from({ length: 13 }).map((_, h) => (
                                            <div
                                                key={h}
                                                className="absolute w-full border-t border-zinc-800/30 border-dashed"
                                                style={{ top: `${h * 90}px` }}
                                            />
                                        ))}

                                        {/* Events */}
                                        {dayEvents.map((evt, j) => {
                                            const startTime = parseISO(evt.start_time);
                                            const endTime = parseISO(evt.end_time);

                                            const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                                            const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

                                            const topPx = (startMinutes - 480) * 1.5;
                                            const heightPx = Math.max((endMinutes - startMinutes) * 1.5, 30); // min 30px height

                                            if (endMinutes <= 480 || startMinutes >= 1260) return null;

                                            const isClubEvent = !!evt.club_name;
                                            const eventColor = isClubEvent ? (evt.club_color || '#a855f7') : themeColor;

                                            return (
                                                <div
                                                    key={j}
                                                    id={`agenda-event-${evt.id || j}`}
                                                    onClick={() => evt.id && setSelectedEventId(evt.id)}
                                                    className={`absolute left-0.5 right-0.5 rounded-none text-xs p-1.5 transition cursor-pointer overflow-hidden z-10 flex flex-col group shadow-sm`}
                                                    style={{
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        minHeight: heightPx < 45 ? 'auto' : undefined,
                                                        backgroundColor: eventColor + '15',
                                                        borderColor: eventColor + '40',
                                                        borderWidth: '1px',
                                                        borderLeft: `2px solid ${eventColor}`
                                                    }}
                                                >
                                                    <div
                                                        className={`flex justify-between items-center font-bold text-[10px] leading-tight mb-0.5`}
                                                        style={{ color: eventColor }}
                                                    >
                                                        <span>{format(startTime, "HH:mm")}-{format(endTime, "HH:mm")}</span>
                                                    </div>
                                                    <p
                                                        className={`font-semibold leading-tight text-white ${heightPx < 60 ? 'line-clamp-1' : 'line-clamp-2'}`}
                                                    >
                                                        {evt.name}
                                                    </p>
                                                    {evt.room && heightPx >= 70 && (
                                                        <p
                                                            className={`mt-auto opacity-75 flex items-center gap-1 line-clamp-1 truncate text-[10px]`}
                                                            style={{ color: eventColor }}
                                                        >
                                                            <MapPin className="w-3 h-3 shrink-0" /> {evt.room}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            {selectedEventId && (
                <EventDetailsModal 
                    eventId={selectedEventId} 
                    onClose={() => setSelectedEventId(null)} 
                />
            )}
        </div>
        </div>
    );
}
