"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { fetchPrivate, getStudentImageUrl } from "@/lib/api";
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
import IndoorRoomLink from "@/components/IndoorRoomLink";
import { isUuid, parseLocalDate, startOfWeek, timetableHref } from "@/lib/timetableContext";
import { dayIntervals, type TimetableEvent } from "@/lib/timetable";
import { useRouter } from "next/navigation";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 21:00
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const timeToMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
const validTime = (value: string | null) => !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function TimetableComparePage() {
    const router = useRouter();
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
    const [slotBounds, setSlotBounds] = useState<{start: number, end: number} | null>(null);
    const dragAnchor = useRef<number | null>(null);
    const hasDragged = useRef(false);
    const [customStart, setCustomStart] = useState("08:00");
    const [customEnd, setCustomEnd] = useState("09:00");
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);

    // Keep manual edits inside the clicked free window and at least 15 minutes long.
    const handleTimeChange = (type: 'start' | 'end', value: string) => {
        if (!selectedSlot || !slotBounds || !validTime(value)) return;
        const minutes = timeToMinutes(value);
        if (type === 'start' && (minutes < slotBounds.start || minutes > timeToMinutes(customEnd) - 15)) return;
        if (type === 'end' && (minutes > slotBounds.end || minutes < timeToMinutes(customStart) + 15)) return;
        const start = new Date(selectedSlot.start);
        const end = new Date(selectedSlot.end);
        if (type === 'start') { start.setHours(Math.floor(minutes / 60), minutes % 60); setCustomStart(value); }
        else { end.setHours(Math.floor(minutes / 60), minutes % 60); setCustomEnd(value); }
        setSelectedSlot({ start, end });
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [dataError, setDataError] = useState("");
    const [roomError, setRoomError] = useState("");
    const [agendaError, setAgendaError] = useState("");
    const [availableError, setAvailableError] = useState("");
    const [searchError, setSearchError] = useState("");
    const [reload, setReload] = useState(0);
    const [agendaLoadedKey, setAgendaLoadedKey] = useState("");
    const [roomLoadedKey, setRoomLoadedKey] = useState("");
    const [urlReady, setUrlReady] = useState(false);
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

    useEffect(() => {
        let generation = 0;
        const restore = async () => {
            const ownGeneration = ++generation;
            setUrlReady(false);
            const params = new URLSearchParams(window.location.search);
            const rawWeek = parseLocalDate(params.get("week"));
            const week = rawWeek ? startOfWeek(rawWeek) : null;
            const day = parseLocalDate(params.get("day"));
            const start = params.get("start");
            const end = params.get("end");
            const ids = [...new Set((params.get("students") || "").split(",").filter(isUuid))].slice(0, 20);

            setCurrentDate(week || new Date());
            setSelectedRoom(null);
            if (day && week && validTime(start) && validTime(end)) {
                const startMin = timeToMinutes(start!);
                const endMin = timeToMinutes(end!);
                const weekEnd = new Date(week);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (day >= week && day <= weekEnd && startMin >= 480 && endMin <= 1260 && startMin < endMin) {
                    const selectedStart = new Date(day);
                    selectedStart.setHours(Math.floor(startMin / 60), startMin % 60);
                    const selectedEnd = new Date(day);
                    selectedEnd.setHours(Math.floor(endMin / 60), endMin % 60);
                    setSelectedSlot({ start: selectedStart, end: selectedEnd });
                    setSlotBounds({ start: 480, end: 1260 });
                    setCustomStart(start!);
                    setCustomEnd(end!);
                } else setSelectedSlot(null);
            } else setSelectedSlot(null);

            let people, rooms;
            try {
                [people, rooms] = await Promise.all([
                    Promise.all(ids.map(id => fetchPrivate(`/students/${id}`))),
                    fetchPrivate("/agenda/rooms/list"),
                ]);
            } catch {
                if (ownGeneration === generation) setDataError("Impossible de charger les personnes ou les salles. Réessayez.");
                return;
            }
            setDataError("");
            if (ownGeneration !== generation) return;
            setSelectedStudents(people.filter(Boolean));
            setAllRooms(rooms);
            const requestedRoom = params.get("room");
            let restoredRoom: string | null = null;
            if (requestedRoom) {
                try {
                    const resolved = await fetchPrivate(`/agenda/rooms/resolve?q=${encodeURIComponent(requestedRoom)}`);
                    if (ownGeneration !== generation) return;
                    restoredRoom = resolved.room;
                } catch { if(ownGeneration === generation)setDataError("Impossible de résoudre la salle. Réessayez."); return; }
            }
            if(requestedRoom && !restoredRoom){setDataError("La salle du lien est introuvable ou ambiguë. Retirez le paramètre de salle ou choisissez une autre salle.");return;}
            setSelectedRoom(restoredRoom);
            setUrlReady(true);
        };
        void restore();
        window.addEventListener("popstate", restore);
        return () => { generation++; window.removeEventListener("popstate", restore); };
    }, [reload]);

    useEffect(() => {
        if (!urlReady) return;
        const timer = setTimeout(() => {
            const href = timetableHref({
                students: selectedStudents.map(student => student.id),
                room: selectedRoom,
                week: weekRange.start,
                day: selectedSlot?.start,
                start: selectedSlot?.start,
                end: selectedSlot?.end,
            });
            if (`${window.location.pathname}${window.location.search}` !== href) window.history.replaceState(null, "", href);
        }, 250);
        return () => clearTimeout(timer);
    }, [urlReady, selectedStudents, selectedRoom, weekRange, selectedSlot]);

    const agendaKey = `${selectedStudents.map(student => student.id).sort().join(",")}:${formatDate(weekRange.start)}`;
    const roomKey = `${selectedRoom}:${formatDate(weekRange.start)}`;
    const dataPending = !urlReady || (!!selectedStudents.length && agendaLoadedKey !== agendaKey) || (!!selectedRoom && roomLoadedKey !== roomKey);

    useEffect(() => {
        const controller = new AbortController();
        if (!selectedStudents.length) { setAgendas({}); setLoadingAgendas(false); setAgendaError(""); return; }
        setLoadingAgendas(true); setAgendaError("");
        fetchPrivate("/agenda/compare", {
            method: "POST", signal: controller.signal,
            body: JSON.stringify({student_ids:selectedStudents.map(student=>student.id),start_date:formatDate(weekRange.start),end_date:formatDate(weekRange.end)}),
        }).then(data => {if(!controller.signal.aborted){setAgendas(data);setAgendaLoadedKey(agendaKey);}})
        .catch(() => {if(!controller.signal.aborted){setAgendas({});setAgendaError("Impossible de charger les agendas sélectionnés.");}})
        .finally(() => {if(!controller.signal.aborted)setLoadingAgendas(false);});
        return () => controller.abort();
    }, [selectedStudents, weekRange, agendaKey]);

    useEffect(() => {
        const controller = new AbortController();
        if (!selectedRoom) {setRoomEvents([]);setLoadingRoom(false);setRoomError("");return;}
        setLoadingRoom(true);setRoomError("");
        const params=new URLSearchParams({room_query:selectedRoom,exact:"true",start_date:formatDate(weekRange.start),end_date:formatDate(weekRange.end)});
        fetchPrivate(`/agenda/rooms/occupancy?${params}`,{signal:controller.signal})
        .then(data=>{if(!controller.signal.aborted){setRoomEvents(data);setRoomLoadedKey(roomKey);}})
        .catch(()=>{if(!controller.signal.aborted){setRoomEvents([]);setRoomError("Impossible de charger l’occupation de cette salle.");}})
        .finally(()=>{if(!controller.signal.aborted)setLoadingRoom(false);});
        return ()=>controller.abort();
    }, [selectedRoom,weekRange,roomKey]);

    const events = useMemo(() => [...Object.values(agendas).flat(), ...(selectedRoom ? roomEvents : [])] as TimetableEvent[], [agendas, roomEvents, selectedRoom]);
    const slotIsFree = !selectedSlot || dayIntervals(selectedSlot.start,events).some(interval => interval.type === "free" && interval.start <= selectedSlot.start.getHours()*60+selectedSlot.start.getMinutes() && interval.end >= selectedSlot.end.getHours()*60+selectedSlot.end.getMinutes());

    // Check available rooms for selected slot
    useEffect(() => {
        if (!selectedSlot || !slotIsFree || dataPending || agendaError || roomError) {setAvailableRooms([]);setLoadingAvailable(false);return;}
        setAvailableError("");
        setLoadingAvailable(true);
        setAvailableRooms([]);
        const params = new URLSearchParams({
            start_time: `${formatDate(selectedSlot.start)}T${formatTime(selectedSlot.start.getHours() * 60 + selectedSlot.start.getMinutes())}:00`,
            end_time: `${formatDate(selectedSlot.end)}T${formatTime(selectedSlot.end.getHours() * 60 + selectedSlot.end.getMinutes())}:00`
        });
        let cancelled = false;
        const timer = setTimeout(() => {
            fetchPrivate(`/agenda/rooms/available?${params.toString()}`)
                .then((rooms: string[]) => { if (!cancelled) setAvailableRooms(rooms); })
                .catch(() => {if(!cancelled)setAvailableError("Impossible de vérifier les salles libres.");})
                .finally(() => { if (!cancelled) setLoadingAvailable(false); });
        }, 200);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [selectedSlot,slotIsFree,dataPending,agendaError,roomError]);

    // Student search logic
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);setIsSearching(false);
            return;
        }
        setIsSearching(true);setSearchError("");
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetchPrivate(`/students?q=${encodeURIComponent(searchQuery)}&limit=8`,{signal:controller.signal})
                .then(res => {if(!controller.signal.aborted)setSearchResults(res.filter((s: any) => !selectedStudents.find(ss => ss.id === s.id)));})
                .catch(()=>{if(!controller.signal.aborted){setSearchResults([]);setSearchError("Recherche indisponible.");}})
                .finally(() => {if(!controller.signal.aborted)setIsSearching(false);});
        }, 300);
        return () => {clearTimeout(timer);controller.abort();};
    }, [searchQuery, selectedStudents]);

    const addStudent = (student: any) => { setSelectedStudents(prev => prev.some(person=>person.id===student.id)?prev:[...prev, student]); setSelectedSlot(null); setSearch(""); setSearchResults([]); };
    const removeStudent = (id: string) => { setSelectedStudents(prev => prev.filter(s => s.id !== id)); setSelectedSlot(null); };
    const nextWeek = () => { const n = new Date(currentDate); n.setDate(currentDate.getDate() + 7); setSelectedSlot(null); setCurrentDate(n); };
    const prevWeek = () => { const p = new Date(currentDate); p.setDate(currentDate.getDate() - 7); setSelectedSlot(null); setCurrentDate(p); };

    // Filtered rooms for selector
    const filteredRooms = useMemo(() => {
        if (!roomSearch) return allRooms;
        return allRooms.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase()));
    }, [allRooms, roomSearch]);

    const processedDays = useMemo(() => DAYS.map((_, index) => {
        const day = new Date(weekRange.start);day.setDate(day.getDate()+index);
        return dayIntervals(day,events);
    }),[weekRange,events]);
    const getProcessedDayData = (dayIndex: number) => processedDays[dayIndex];

    const selectFreeSlot = (dayIndex: number, boundsStart: number, boundsEnd: number, startMin: number, endMin: number) => {
        const date = new Date(weekRange.start);
        date.setDate(date.getDate() + dayIndex);
        
        const start = new Date(date);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

        const end = new Date(date);
        end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

        setCustomStart(formatTime(startMin));
        setCustomEnd(formatTime(endMin));
        setSlotBounds({ start: boundsStart, end: boundsEnd });
        setSelectedSlot({ start, end });
    };

    const pointerMinute = (event: React.PointerEvent<HTMLDivElement>, start: number, end: number) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const offset = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        return Math.min(end - 15, start + Math.floor((offset * (end - start)) / 15) * 15);
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

                    {(dataError || roomError || agendaError) && <div role="alert" className="flex items-center justify-between border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300"><span>{dataError || roomError || agendaError}</span><button onClick={()=>{setSelectedSlot(null);setReload(value=>value+1);}} className="border border-red-500/30 px-3 py-2">Réessayer</button></div>}
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

                                    {isSearching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
                                    {searchError && <p role="status" className="text-xs text-red-400">{searchError}</p>}
                                    {searchResults.length > 0 && (
                                        <div className="bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 shadow-2xl">
                                            {searchResults.map(s => (
                                                <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-timetable-500/10 cursor-pointer group transition-all" onClick={() => addStudent(s)}>
                                                    <Avatar className="h-8 w-8 rounded-none border border-zinc-800"><AvatarImage src={getStudentImageUrl(s.id)} className="object-cover grayscale group-hover:grayscale-0" /><AvatarFallback>{s.first_name[0]}</AvatarFallback></Avatar>
                                                    <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-white uppercase truncate">{s.first_name} {s.last_name}</p></div>
                                                    <UserPlus className="w-3 h-3 text-zinc-700 group-hover:text-timetable-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {selectedStudents.map(s => (
                                            <div key={s.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-2 group transition-all hover:border-zinc-600">
                                                <Avatar className="h-6 w-6 rounded-none"><AvatarImage src={getStudentImageUrl(s.id)} className="grayscale" /><AvatarFallback>{s.first_name[0]}</AvatarFallback></Avatar>
                                                <button type="button" onClick={() => router.push(`/palantint/students/${s.id}`)} className="flex-1 text-left text-[10px] font-bold text-zinc-300 hover:text-timetable-400 uppercase truncate">{s.first_name} {s.last_name}</button>
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

                                    <div className="bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 max-h-48 overflow-y-auto custom-scrollbar shadow-2xl" aria-label="Classroom list">
                                            {filteredRooms.map(room => (
                                                <button type="button" key={room} className={`w-full p-3 flex items-center justify-between text-left hover:bg-timetable-500/10 cursor-pointer group transition-all ${selectedRoom === room ? 'bg-timetable-500/10' : ''}`} onClick={() => { setSelectedRoom(room); setSelectedSlot(null); setRoomSearch(''); }}>
                                                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white uppercase">{room}</span>
                                                    <Zap className="w-3 h-3 text-zinc-800 group-hover:text-timetable-500" />
                                                </button>
                                            ))}
                                            {filteredRooms.length === 0 && <p className="p-3 text-[10px] font-mono text-zinc-500">No classrooms found.</p>}
                                    </div>

                                    {selectedRoom && <IndoorRoomLink room={selectedRoom} />}
                                    {selectedRoom && (
                                        <div className="p-3 bg-timetable-500/10 border border-timetable-500/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-timetable-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase font-mono tracking-widest">{selectedRoom}</span>
                                            </div>
                                            <button onClick={() => { setSelectedRoom(null); setSelectedSlot(null); setRoomSearch(""); }} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
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
                                                <span className="text-[10px] text-zinc-400 font-mono text-center">
                                                    {selectedStudents.length} personne(s) · {selectedRoom || 'Toute salle'} · {customStart}–{customEnd}
                                                </span>
                                                <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${timetableHref({ students: selectedStudents.map(student => student.id), room: selectedRoom, week: weekRange.start, day: selectedSlot.start, start: selectedSlot.start, end: selectedSlot.end })}`)} className="text-[9px] text-timetable-400 hover:text-white font-mono uppercase">Copier le lien de cette sélection</button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Start</span>
                                                    <input 
                                                        type="time" aria-label="Début du créneau"
                                                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-white p-1 focus:border-orga-500 outline-none"
                                                        value={customStart}
                                                        min={slotBounds ? formatTime(slotBounds.start) : undefined}
                                                        max={customEnd}
                                                        step={900}
                                                        onChange={(e) => handleTimeChange('start', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-mono text-zinc-500 uppercase">End</span>
                                                    <input 
                                                        type="time" aria-label="Fin du créneau"
                                                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-white p-1 focus:border-orga-500 outline-none"
                                                        value={customEnd}
                                                        min={customStart}
                                                        max={slotBounds ? formatTime(slotBounds.end) : undefined}
                                                        step={900}
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
                                            {availableError && <p role="alert" className="text-xs text-red-400">{availableError}</p>}
                                            {!slotIsFree && <p role="alert" className="text-xs text-amber-400">Ce créneau chevauche une occupation. Choisissez un créneau libre.</p>}
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-wrap gap-2">
                                                {availableRooms.map(room => (
                                                    <button 
                                                        key={room} 
                                                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[9px] font-mono text-zinc-400 uppercase hover:border-orga-500 hover:text-white transition-all"
                                                        onClick={() => { setSelectedRoom(room); setSelectedSlot(null); setRoomSearch(''); }}
                                                    >
                                                        {room}
                                                    </button>
                                                ))}
                                                {availableRooms.length === 0 && !loadingAvailable && !availableError && slotIsFree && !dataPending && (
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
                                    <Button aria-label="Semaine précédente" variant="outline" size="sm" onClick={prevWeek} className="rounded-none border-zinc-800 bg-black/40 hover:bg-timetable-500/10 hover:border-timetable-500 transition-all"><ChevronLeft className="w-4 h-4" /></Button>
                                    <div className="flex flex-col items-center min-w-[200px]">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Temporal Window</span>
                                        <span className="text-xs font-black text-white uppercase">{weekRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <Button aria-label="Semaine suivante" variant="outline" size="sm" onClick={nextWeek} className="rounded-none border-zinc-800 bg-black/40 hover:bg-timetable-500/10 hover:border-timetable-500 transition-all"><ChevronRight className="w-4 h-4" /></Button>
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
                                {(dataPending || loadingAgendas || loadingRoom || agendaError || roomError || dataError) && <div role="status" className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/85 text-sm text-zinc-400">{agendaError || roomError || dataError ? "Disponibilités indisponibles" : <><Loader2 className="mr-3 h-4 w-4 animate-spin" />Chargement des disponibilités…</>}</div>}
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
                                                                return <div key={idx} title={interval.events.map(event=>event.name).join(" · ")} className="absolute left-0.5 right-0.5 overflow-hidden border border-zinc-700 bg-zinc-800/70 p-1 text-[9px] text-zinc-400" style={{top:`${top}%`,height:`${height}%`}}>{interval.events.map(event=>event.name).join(" · ")}</div>;
                                                            }

                                                            const dayDate = new Date(weekRange.start);
                                                            dayDate.setDate(dayDate.getDate() + dayIdx);
                                                            const isSelected = selectedSlot && 
                                                                formatDate(selectedSlot.start) === formatDate(dayDate) &&
                                                                selectedSlot.start.getHours() * 60 + selectedSlot.start.getMinutes() >= interval.start &&
                                                                selectedSlot.end.getHours() * 60 + selectedSlot.end.getMinutes() <= interval.end;

                                                            return (
                                                                <div 
                                                                    key={idx}
                                                                    className={`absolute left-0.5 right-0.5 cursor-crosshair group touch-none select-none transition-[background-color,border-color,box-shadow] overflow-hidden border-l-4 ${isSelected ? 'bg-emerald-500/15 border-emerald-400 z-20 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]' : 'bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 hover:z-10 hover:shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45),inset_0_0_24px_rgba(16,185,129,0.18)]'}`}
                                                                    role="button" tabIndex={interval.end-interval.start>=15?0:-1} aria-label={`Créneau libre ${DAYS[dayIdx]} ${formatTime(interval.start)} à ${formatTime(interval.end)}`}
                                                                    onKeyDown={event=>{if((event.key==="Enter"||event.key===" ")&&interval.end-interval.start>=15){event.preventDefault();selectFreeSlot(dayIdx,interval.start,interval.end,interval.start,Math.min(interval.end,interval.start+60));}}}
                                                                    style={{ top: `${top}%`, height: `${height}%` }}
                                                                    onPointerDown={(event) => {
                                                                        if (interval.end - interval.start < 15) return;
                                                                        event.currentTarget.setPointerCapture(event.pointerId);
                                                                        const anchor = pointerMinute(event, interval.start, interval.end);
                                                                        dragAnchor.current = anchor;
                                                                        hasDragged.current = false;
                                                                        selectFreeSlot(dayIdx, interval.start, interval.end, anchor, Math.min(interval.end, anchor + 60));
                                                                    }}
                                                                    onPointerMove={(event) => {
                                                                        if (dragAnchor.current === null) return;
                                                                        const minute = pointerMinute(event, interval.start, interval.end);
                                                                        if (minute !== dragAnchor.current) {
                                                                            hasDragged.current = true;
                                                                            selectFreeSlot(dayIdx, interval.start, interval.end, Math.min(dragAnchor.current, minute), Math.max(dragAnchor.current, minute) + 15);
                                                                        } else if (hasDragged.current) {
                                                                            selectFreeSlot(dayIdx, interval.start, interval.end, minute, minute + 15);
                                                                        }
                                                                    }}
                                                                    onPointerUp={() => { dragAnchor.current = null; }}
                                                                    onPointerCancel={() => { dragAnchor.current = null; }}
                                                                >
                                                                    <div className="p-2 flex flex-col h-full">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Available</span>
                                                                            <Clock className="w-3 h-3 text-emerald-500 opacity-50 group-hover:opacity-100" />
                                                                        </div>
                                                                        <span className="mt-auto text-[8px] font-mono text-zinc-500 uppercase">
                                                                            {Math.floor(interval.start / 60)}:{(interval.start % 60).toString().padStart(2, '0')} - {Math.floor(interval.end / 60)}:{(interval.end % 60).toString().padStart(2, '0')}
                                                                        </span>
                                                                        {isSelected && selectedSlot && <div className="absolute left-0 right-0 bg-emerald-400/30 border-y border-emerald-300 pointer-events-none" style={{ top: `${((selectedSlot.start.getHours() * 60 + selectedSlot.start.getMinutes() - interval.start) / (interval.end - interval.start)) * 100}%`, height: `${((selectedSlot.end.getTime() - selectedSlot.start.getTime()) / 60000 / (interval.end - interval.start)) * 100}%` }} />}
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
