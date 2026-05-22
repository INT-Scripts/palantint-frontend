"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchAPI } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { PALETTE } from "@/lib/colors";
import { 
    Users, Clock, CalendarDays, Search, X, UserPlus, 
    ChevronLeft, ChevronRight, CheckCircle2, Info, MapPin as MapPinIcon,
    Zap, Calendar, BookOpen, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Box } from "@/components/ui/box";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetableComparePage() {
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [searchQuery, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Room Selection
    const [allRooms, setAllRooms] = useState<string[]>([]);
    const [roomSearch, setRoomSearch] = useState("");
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [roomEvents, setRoomEvents] = useState<any[]>([]);
    const [loadingRoom, setLoadingRoom] = useState(false);

    // Slot Analysis
    const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
    const [customStart, setCustomStart] = useState("08:00");
    const [customEnd, setCustomEnd] = useState("09:00");
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);

    // Update selected slot when custom times change
    const handleTimeChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') setCustomStart(value);
        else setCustomEnd(value);

        if (selectedSlot) {
            const [h, m] = value.split(':').map(Number);
            const start = new Date(selectedSlot.start);
            const end = new Date(selectedSlot.end);

            if (type === 'start') {
                start.setHours(h, m, 0, 0);
            } else {
                end.setHours(h, m, 0, 0);
            }
            
            setSelectedSlot({ start, end });
        }
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [agendas, setAgendas] = useState<Record<string, any[]>>({});
    const [loadingAgendas, setLoadingAgendas] = useState(false);

    // Get start and end of current week
    const weekRange = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }, [currentDate]);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    useEffect(() => {
        document.title = "Timetable Synchronizer | PalantINT";
        // Fetch all rooms for selector
        fetchAPI("/agenda/rooms/list").then(setAllRooms).catch(console.error);
    }, []);

    // Load agendas
    useEffect(() => {
        if (selectedStudents.length === 0) {
            setAgendas({});
            return;
        }
        setLoadingAgendas(true);
        fetchAPI("/agenda/compare", {
            method: "POST",
            body: JSON.stringify({
                student_ids: selectedStudents.map(s => s.id),
                start_date: formatDate(weekRange.start),
                end_date: formatDate(weekRange.end)
            })
        })
        .then(setAgendas)
        .catch(console.error)
        .finally(() => setLoadingAgendas(false));
    }, [selectedStudents, weekRange]);

    // Load room occupancy
    useEffect(() => {
        if (!selectedRoom) {
            setRoomEvents([]);
            return;
        }
        setLoadingRoom(true);
        const params = new URLSearchParams({
            room_query: selectedRoom,
            start_date: formatDate(weekRange.start),
            end_date: formatDate(weekRange.end)
        });
        fetchAPI(`/agenda/rooms/occupancy?${params.toString()}`)
            .then(setRoomEvents)
            .finally(() => setLoadingRoom(false));
    }, [selectedRoom, weekRange]);

    // Check available rooms for selected slot
    useEffect(() => {
        if (!selectedSlot) return;
        setLoadingAvailable(true);
        const params = new URLSearchParams({
            start_time: selectedSlot.start.toISOString(),
            end_time: selectedSlot.end.toISOString()
        });
        fetchAPI(`/agenda/rooms/available?${params.toString()}`)
            .then(setAvailableRooms)
            .finally(() => setLoadingAvailable(false));
    }, [selectedSlot]);

    // Student search logic
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(() => {
            fetchAPI(`/students?q=${searchQuery}&limit=5`)
                .then(res => setSearchResults(res.filter((s: any) => !selectedStudents.find(ss => ss.id === s.id))))
                .finally(() => setIsSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedStudents]);

    const addStudent = (student: any) => { setSelectedStudents(prev => [...prev, student]); setSearch(""); setSearchResults([]); };
    const removeStudent = (id: string) => setSelectedStudents(prev => prev.filter(s => s.id !== id));
    const nextWeek = () => { const n = new Date(currentDate); n.setDate(currentDate.getDate() + 7); setCurrentDate(n); };
    const prevWeek = () => { const p = new Date(currentDate); p.setDate(currentDate.getDate() - 7); setCurrentDate(p); };

    // Filtered rooms for selector
    const filteredRooms = useMemo(() => {
        if (!roomSearch) return allRooms.slice(0, 10);
        return allRooms.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase())).slice(0, 10);
    }, [allRooms, roomSearch]);

    // Unified Logic to find Free Time Windows
    const getProcessedDayData = (dayIndex: number) => {
        const dayDate = new Date(weekRange.start);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        const dateStr = formatDate(dayDate);

        // 1. Collect all busy slots
        let busyIntervals: {start: number, end: number}[] = [];
        
        Object.values(agendas).forEach((events: any[]) => {
            events.forEach(evt => {
                if (evt.start_time.startsWith(dateStr)) {
                    const s = new Date(evt.start_time);
                    const e = new Date(evt.end_time);
                    busyIntervals.push({ 
                        start: s.getHours() * 60 + s.getMinutes(), 
                        end: e.getHours() * 60 + e.getMinutes() 
                    });
                }
            });
        });

        if (selectedRoom) {
            roomEvents.forEach(evt => {
                if (evt.start_time.startsWith(dateStr)) {
                    const s = new Date(evt.start_time);
                    const e = new Date(evt.end_time);
                    busyIntervals.push({ 
                        start: s.getHours() * 60 + s.getMinutes(), 
                        end: e.getHours() * 60 + e.getMinutes() 
                    });
                }
            });
        }

        // 2. Merge overlapping busy intervals
        if (busyIntervals.length === 0) {
            return [{ type: 'free', start: 480, end: 1260 }]; // Whole day free (8am-9pm)
        }

        busyIntervals.sort((a, b) => a.start - b.start);
        const merged: {start: number, end: number}[] = [busyIntervals[0]];
        for (let i = 1; i < busyIntervals.length; i++) {
            const last = merged[merged.length - 1];
            if (busyIntervals[i].start < last.end) {
                last.end = Math.max(last.end, busyIntervals[i].end);
            } else {
                merged.push(busyIntervals[i]);
            }
        }

        // 3. Find gaps (Free Windows) between 8:00 (480) and 21:00 (1260)
        const result: {type: 'free' | 'busy', start: number, end: number}[] = [];
        let current = 480;

        merged.forEach(interval => {
            if (interval.start > current) {
                result.push({ type: 'free', start: current, end: interval.start });
            }
            // Add the busy block as well for the grid layout
            result.push({ type: 'busy', start: interval.start, end: interval.end });
            current = Math.max(current, interval.end);
        });

        if (current < 1260) {
            result.push({ type: 'free', start: current, end: 1260 });
        }

        return result;
    };

    const handleFreeSlotClick = (dayIndex: number, startMin: number, endMin: number) => {
        const date = new Date(weekRange.start);
        date.setDate(date.getDate() + dayIndex);
        
        const start = new Date(date);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

        const end = new Date(date);
        end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

        setCustomStart(`${Math.floor(startMin / 60).toString().padStart(2, '0')}:${(startMin % 60).toString().padStart(2, '0')}`);
        setCustomEnd(`${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`);
        
        setSelectedSlot({ start, end });
    };

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-timetable-500/30 font-sans">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-timetable-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-timetable-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-12">
                    <PageHeader
                        badgeText="SI-Etudiant monitor // Active"
                        title1="TIMETABLE"
                        title2="Organiser"
                        titleGradient="from-timetable-400 to-timetable-600"
                        subtitle="Find time gaps where all selected students are available and classrooms are vacant."
                        colorName="timetable"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            {/* Student Selector */}
                            <Box title="Student Selector" icon={<UserPlus className="w-4 h-4 text-timetable-500" />}>
                                <div className="p-4 space-y-4">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-timetable-500 transition-colors" />
                                        <Input 
                                            placeholder="SEARCH STUDENT..." 
                                            className="pl-10 bg-zinc-950 border-zinc-800 rounded-none focus:border-timetable-500 transition-all h-12 text-xs uppercase font-mono"
                                            value={searchQuery}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 shadow-2xl">
                                            {searchResults.map(s => (
                                                <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-timetable-500/10 cursor-pointer group transition-all" onClick={() => addStudent(s)}>
                                                    <Avatar className="h-8 w-8 rounded-none border border-zinc-800"><AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${s.id}/image`} className="object-cover grayscale group-hover:grayscale-0" /><AvatarFallback>{s.first_name[0]}</AvatarFallback></Avatar>
                                                    <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-white uppercase truncate">{s.first_name} {s.last_name}</p></div>
                                                    <UserPlus className="w-3 h-3 text-zinc-700 group-hover:text-timetable-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {selectedStudents.map(s => (
                                            <div key={s.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-2 group transition-all hover:border-zinc-600">
                                                <Avatar className="h-6 w-6 rounded-none"><AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${s.id}/image`} className="grayscale" /><AvatarFallback>{s.first_name[0]}</AvatarFallback></Avatar>
                                                <span className="flex-1 text-[10px] font-bold text-zinc-300 uppercase truncate">{s.first_name} {s.last_name}</span>
                                                <button onClick={() => removeStudent(s.id)} className="text-zinc-700 hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Box>

                            {/* Classroom Selector */}
                            <Box title="Classroom Selector" icon={<MapPinIcon className="w-4 h-4 text-timetable-500" />}>
                                <div className="p-4 space-y-4">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-timetable-500 transition-colors" />
                                        <Input 
                                            placeholder="SEARCH CLASSROOM..." 
                                            className="pl-10 bg-zinc-950 border-zinc-800 rounded-none focus:border-timetable-500 transition-all h-12 text-xs uppercase font-mono"
                                            value={roomSearch}
                                            onChange={(e) => setRoomSearch(e.target.value)}
                                        />
                                    </div>

                                    {roomSearch && !selectedRoom && (
                                        <div className="bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 max-h-48 overflow-y-auto custom-scrollbar shadow-2xl">
                                            {filteredRooms.map(room => (
                                                <div key={room} className="p-3 flex items-center justify-between hover:bg-timetable-500/10 cursor-pointer group transition-all" onClick={() => { setSelectedRoom(room); setRoomSearch(room); }}>
                                                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white uppercase">{room}</span>
                                                    <Zap className="w-3 h-3 text-zinc-800 group-hover:text-timetable-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedRoom && (
                                        <div className="p-3 bg-timetable-500/10 border border-timetable-500/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-timetable-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase font-mono tracking-widest">{selectedRoom}</span>
                                            </div>
                                            <button onClick={() => { setSelectedRoom(null); setRoomSearch(""); }} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                </div>
                            </Box>

                            {/* Available Rooms Display */}
                            {selectedSlot && (
                                <Box title="Classroom Availability" icon={<BookOpen className="w-4 h-4 text-orga-500" />}>
                                    <div className="p-4 space-y-4">
                                        <div className="bg-orga-500/5 border border-orga-500/20 p-3 flex flex-col gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-mono text-orga-500 uppercase tracking-widest text-center">Selected Window</span>
                                                <span className="text-[10px] font-black text-white font-mono uppercase text-center border-b border-zinc-800 pb-2">
                                                    {selectedSlot.start.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Start</span>
                                                    <input 
                                                        type="time" 
                                                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-white p-1 focus:border-orga-500 outline-none"
                                                        value={customStart}
                                                        onChange={(e) => handleTimeChange('start', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-mono text-zinc-500 uppercase">End</span>
                                                    <input 
                                                        type="time" 
                                                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-white p-1 focus:border-orga-500 outline-none"
                                                        value={customEnd}
                                                        onChange={(e) => handleTimeChange('end', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                                <span className="text-[9px] font-mono text-zinc-500 uppercase">Vacant Classrooms</span>
                                                {loadingAvailable && <Loader2 className="w-3 h-3 text-orga-500 animate-spin" />}
                                            </div>
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-wrap gap-2">
                                                {availableRooms.map(room => (
                                                    <button 
                                                        key={room} 
                                                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[9px] font-mono text-zinc-400 uppercase hover:border-orga-500 hover:text-white transition-all"
                                                        onClick={() => { setSelectedRoom(room); setRoomSearch(room); }}
                                                    >
                                                        {room}
                                                    </button>
                                                ))}
                                                {availableRooms.length === 0 && !loadingAvailable && (
                                                    <p className="text-[9px] font-mono text-zinc-700 uppercase italic py-4 text-center w-full">No vacant rooms detected.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Box>
                            )}
                        </div>

                        {/* Calendar Grid */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800 p-4 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="sm" onClick={prevWeek} className="rounded-none border-zinc-800 bg-black/40 hover:bg-timetable-500/10 hover:border-timetable-500 transition-all"><ChevronLeft className="w-4 h-4" /></Button>
                                    <div className="flex flex-col items-center min-w-[200px]">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Temporal Window</span>
                                        <span className="text-xs font-black text-white uppercase">{weekRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={nextWeek} className="rounded-none border-zinc-800 bg-black/40 hover:bg-timetable-500/10 hover:border-timetable-500 transition-all"><ChevronRight className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
                                        <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50" /> <span className="text-emerald-400">Available</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
                                        <div className="w-3 h-3 bg-zinc-900 border border-zinc-800" /> <span className="text-zinc-600">Busy</span>
                                    </div>
                                </div>
                            </div>

                            <Box className="w-full h-[900px]" contentClassName="overflow-auto custom-scrollbar">
                                <div className="min-w-[1000px] h-full flex flex-col">
                                    <div className="flex border-b border-zinc-800 bg-black/40 sticky top-0 z-30">
                                        <div className="w-20 border-r border-zinc-800 shrink-0" />
                                        {DAYS.map((day, i) => {
                                            const d = new Date(weekRange.start); d.setDate(d.getDate() + i);
                                            const isToday = formatDate(d) === formatDate(new Date());
                                            return (
                                                <div key={day} className={`flex-1 p-3 text-center border-r border-zinc-800 last:border-r-0 ${isToday ? 'bg-timetable-500/5' : ''}`}>
                                                    <p className={`text-[9px] font-mono uppercase tracking-widest ${isToday ? 'text-timetable-500' : 'text-zinc-500'}`}>{day}</p>
                                                    <p className={`text-lg font-black ${isToday ? 'text-timetable-400' : 'text-white'}`}>{d.getDate()}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex-1 relative">
                                        <div className="absolute inset-0 flex flex-col pointer-events-none">
                                            {HOURS.map(hour => (
                                                <div key={hour} className="flex-1 border-b border-zinc-800/30 relative">
                                                    <div className="absolute left-0 top-0 w-20 h-full border-r border-zinc-800 bg-black/20 flex items-start justify-center pt-2"><span className="text-[10px] font-mono text-zinc-600">{hour}:00</span></div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="absolute inset-0 flex ml-20">
                                            {DAYS.map((_, dayIdx) => {
                                                const dayIntervals = getProcessedDayData(dayIdx);
                                                return (
                                                    <div key={dayIdx} className="flex-1 relative border-r border-zinc-800/30 last:border-r-0 h-full">
                                                        {dayIntervals.map((interval, idx) => {
                                                            const top = ((interval.start - 480) / (13 * 60)) * 100;
                                                            const height = ((interval.end - interval.start) / (13 * 60)) * 100;
                                                            if (top < 0 || top > 100) return null;

                                                            if (interval.type === 'busy') {
                                                                return <div key={idx} className="absolute left-0.5 right-0.5 bg-zinc-900/50 border border-zinc-800 flex items-center justify-center opacity-40 grayscale" style={{ top: `${top}%`, height: `${height}%` }} />;
                                                            }

                                                            const isSelected = selectedSlot && 
                                                                formatDate(selectedSlot.start) === formatDate(new Date(weekRange.start.getTime() + dayIdx * 86400000)) &&
                                                                selectedSlot.start.getHours() * 60 + selectedSlot.start.getMinutes() === interval.start;

                                                            return (
                                                                <div 
                                                                    key={idx}
                                                                    className={`absolute left-0.5 right-0.5 cursor-pointer group transition-all overflow-hidden border-l-4 ${isSelected ? 'bg-emerald-500/30 border-emerald-400 z-20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 hover:z-10'}`}
                                                                    style={{ top: `${top}%`, height: `${height}%` }}
                                                                    onClick={() => handleFreeSlotClick(dayIdx, interval.start, interval.end)}
                                                                >
                                                                    <div className="p-2 flex flex-col h-full">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Available</span>
                                                                            <Clock className="w-3 h-3 text-emerald-500 opacity-50 group-hover:opacity-100" />
                                                                        </div>
                                                                        <span className="mt-auto text-[8px] font-mono text-zinc-500 uppercase">
                                                                            {Math.floor(interval.start / 60)}:{(interval.start % 60).toString().padStart(2, '0')} - {Math.floor(interval.end / 60)}:{(interval.end % 60).toString().padStart(2, '0')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </Box>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
