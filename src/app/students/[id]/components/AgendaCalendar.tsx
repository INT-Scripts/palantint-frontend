"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Loader2, X, Users, Search, MapPin, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AgendaCalendarProps {
    studentId: string;
}

export default function AgendaCalendar({ studentId }: AgendaCalendarProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentDate, setCurrentDate] = useState(new Date());

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [eventDetails, setEventDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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

    useEffect(() => {
        if (selectedEventId) {
            setLoadingDetails(true);
            fetchAPI(`/agenda/events/${selectedEventId}`)
                .then(data => setEventDetails(data))
                .catch(err => console.error(err))
                .finally(() => setLoadingDetails(false));
        } else {
            setEventDetails(null);
            setSearchQuery("");
        }
    }, [selectedEventId]);

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
                    <div className="w-2 h-2 bg-blue-500 animate-pulse" />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Timetable
                    </h2>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, -7))}
                        className="p-1 px-3 bg-zinc-900 border border-zinc-700 text-blue-400 font-mono font-bold hover:bg-blue-500/10 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-center"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs uppercase tracking-widest text-zinc-300 bg-zinc-950 px-3 py-1 border border-zinc-800">
                        {format(weekStart, "dd MMM")} // {format(addDays(weekStart, 6), "dd MMM, yyyy")}
                    </span>
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, 7))}
                        className="p-1 px-3 bg-zinc-900 border border-zinc-700 text-blue-400 font-mono font-bold hover:bg-blue-500/10 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-center"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-blue-500 animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Retrieving Agenda Data...</span>
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
                                <div key={i} className={`flex-1 flex flex-col min-w-[150px] border-r border-zinc-800/50 last:border-0 relative ${isToday ? 'bg-blue-500/5' : ''}`}>
                                    {/* Day Header - Sticky Top */}
                                    <div className={`text-center py-2 border-b ${isToday ? 'border-blue-500/50 bg-blue-900/20' : 'border-zinc-800 bg-zinc-900'} sticky top-0 z-20 h-[60px] flex flex-col justify-center transition-colors`}>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{format(day, "EEEE")}</p>
                                        <p className={`text-sm font-black font-mono tracking-wider ${isToday ? "text-blue-400" : "text-zinc-300"}`}>
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

                                            // 8:00 AM is 480 minutes
                                            // 1.5 pixels per minute (90px / 60min)
                                            const topPx = (startMinutes - 480) * 1.5;
                                            const heightPx = Math.max((endMinutes - startMinutes) * 1.5, 30); // min 30px height

                                            // Don't render if it ends before 8am or starts after 8pm (for simple scope logic)
                                            if (endMinutes <= 480 || startMinutes >= 1260) return null;

                                            const isClubEvent = !!evt.club_name;
                                            const eventColor = isClubEvent ? (evt.club_color || '#a855f7') : undefined;

                                            return (
                                                <div
                                                    key={j}
                                                    onClick={() => evt.id && setSelectedEventId(evt.id)}
                                                    className={`absolute left-1 right-1 rounded-md text-xs p-1.5 transition cursor-pointer overflow-hidden z-10 flex flex-col group shadow-sm ${!isClubEvent ? 'bg-blue-500/10 border-blue-500/30 text-blue-100 hover:bg-blue-500/20 hover:border-blue-500/50 shadow-blue-500/5' : 'hover:brightness-110'}`}
                                                    style={{
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        minHeight: heightPx < 45 ? 'auto' : undefined,
                                                        backgroundColor: eventColor ? eventColor + '25' : undefined,
                                                        borderColor: eventColor ? eventColor + '50' : undefined,
                                                        borderWidth: eventColor ? '1px' : undefined,
                                                    }}
                                                >
                                                    <div
                                                        className={`flex justify-between items-center font-bold text-[10px] leading-tight mb-0.5 ${!isClubEvent ? 'text-blue-300' : ''}`}
                                                        style={{ color: eventColor }}
                                                    >
                                                        <span>{format(startTime, "HH:mm")}-{format(endTime, "HH:mm")}</span>
                                                    </div>
                                                    <p
                                                        className={`font-semibold leading-tight ${!isClubEvent ? 'text-blue-100' : ''} ${heightPx < 60 ? 'line-clamp-1' : 'line-clamp-2'}`}
                                                        style={{ color: isClubEvent ? '#f4f4f5' : undefined }}
                                                    >
                                                        {evt.name}
                                                    </p>
                                                    {evt.room && heightPx >= 70 && (
                                                        <p
                                                            className={`mt-auto opacity-75 flex items-center gap-1 line-clamp-1 truncate text-[10px] ${!evt.club_color ? 'text-blue-200' : ''}`}
                                                            style={{ color: evt.club_color }}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
                            <h3 className="text-xl font-bold text-white flex-1 truncate pr-4">
                                {eventDetails ? eventDetails.name : "Loading Event Details..."}
                            </h3>
                            <button
                                onClick={() => setSelectedEventId(null)}
                                className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white hover:bg-zinc-700 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                                    Loading event participants...
                                </div>
                            ) : eventDetails ? (
                                <div className="space-y-6">
                                    {/* Event Meta */}
                                    <div className="flex flex-wrap gap-4 text-sm bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                                        {eventDetails.club_name && (
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <div className="font-semibold text-white">Club/Asso:</div>
                                                <span
                                                    className="px-2 py-0.5 rounded-md text-xs font-bold border"
                                                    style={{
                                                        backgroundColor: eventDetails.club_color ? eventDetails.club_color + '33' : '#3f3f46',
                                                        color: eventDetails.club_color || '#e4e4e7',
                                                        borderColor: eventDetails.club_color ? eventDetails.club_color + '80' : '#52525b'
                                                    }}
                                                >
                                                    {eventDetails.club_name}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <div className="font-semibold text-white">Type:</div> {eventDetails.type}
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <div className="font-semibold text-white">Time:</div> {format(parseISO(eventDetails.start_time), "HH:mm")} - {format(parseISO(eventDetails.end_time), "HH:mm")}
                                        </div>
                                        {eventDetails.room && (
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <div className="font-semibold text-white">Room:</div> <MapPin className="w-4 h-4 text-blue-400" /> {eventDetails.room}
                                            </div>
                                        )}
                                        {eventDetails.professors && (
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <div className="font-semibold text-white">Trainer(s):</div> {eventDetails.professors}
                                            </div>
                                        )}
                                    </div>

                                    {/* Students List */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-lg font-bold flex items-center gap-2 text-white">
                                                <Users className="w-5 h-5 text-blue-500" /> Attendees ({eventDetails.students?.length || 0})
                                            </h4>

                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search attendees..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-full text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition w-48 focus:w-64"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {eventDetails.students
                                                .filter((s: any) =>
                                                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (s.promo || "").toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map((student: any) => (
                                                    <div
                                                        key={student.id}
                                                        onClick={() => {
                                                            setSelectedEventId(null);
                                                            router.push(`/students/${student.id}`);
                                                        }}
                                                        className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl hover:border-blue-500/50 cursor-pointer transition group"
                                                    >
                                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                                                            {student.profile_picture_path ? (
                                                                <img
                                                                    src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image`}
                                                                    alt={student.first_name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                                                />
                                                            ) : (
                                                                <UserIcon className="w-5 h-5 text-zinc-600" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-white truncate">{student.first_name} {student.last_name}</p>
                                                            <p className="text-xs text-zinc-500 truncate">{student.promo || "Student"}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            {eventDetails.students?.length > 0 &&
                                                eventDetails.students.filter((s: any) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                    <div className="col-span-full text-center py-8 text-zinc-500 text-sm">
                                                        No attendees match your search.
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-500">
                                    Could not load event details.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
