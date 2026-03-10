"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { X, Users, MapPin, User as UserIcon, Search, Activity, Clock, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EventDetailsModalProps {
    eventId: string;
    onClose: () => void;
}

export default function EventDetailsModal({ eventId, onClose }: EventDetailsModalProps) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (eventId) {
            setLoading(true);
            fetchAPI(`/agenda/events/${eventId}`)
                .then(data => setDetails(data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [eventId]);

    if (!eventId) return null;

    const attendees = details?.students?.filter((s: any) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.promo || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-none w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300">
                {/* Tech Accents */}
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />

                <div className="flex justify-between items-center p-8 border-b border-zinc-800">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-3 text-blue-500 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="font-mono text-[10px] tracking-[0.3em] font-black uppercase">EVENT_INTELLIGENCE // FETCHED</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter truncate leading-none">
                            {loading ? "Decrypting..." : (details?.name || "Unknown Event")}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-6 p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition transition-colors rounded-none"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-6">
                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.5em] animate-pulse">Scanning Data Streams...</p>
                        </div>
                    ) : details ? (
                        <div className="space-y-10">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/40 border border-zinc-800/60 p-5 group hover:border-blue-500/30 transition-all">
                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-blue-500" /> Temporal Window
                                    </p>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-white font-mono">
                                            {format(parseISO(details.start_time), "HH:mm")} - {format(parseISO(details.end_time), "HH:mm")}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-mono uppercase">
                                            {format(parseISO(details.start_time), "EEEE dd MMMM yyyy")}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-zinc-800/60 p-5 group hover:border-orange-500/30 transition-all">
                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-orange-500" /> Geospatial Loc
                                    </p>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-white font-mono truncate uppercase">
                                            {details.room || "FIELD_OP"}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-mono uppercase">
                                            Physical Room Assignment
                                        </p>
                                    </div>
                                </div>

                                {details.club_name && (
                                    <div className="bg-black/40 border border-zinc-800/60 p-5 group hover:border-emerald-500/30 transition-all">
                                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Users className="w-3 h-3 text-emerald-500" /> Organizing Entity
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span 
                                                className="px-3 py-1 bg-zinc-950 border font-mono text-[10px] font-black uppercase tracking-widest"
                                                style={{ 
                                                    borderColor: details.club_color + '50',
                                                    color: details.club_color || '#10b981',
                                                    backgroundColor: details.club_color + '10'
                                                }}
                                            >
                                                {details.club_name}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-black/40 border border-zinc-800/60 p-5 group hover:border-zinc-700 transition-all">
                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-zinc-400" /> Operation Type
                                    </p>
                                    <p className="text-sm font-black text-zinc-200 font-mono uppercase tracking-wider">
                                        {details.type || "STANDARD_EVENT"}
                                    </p>
                                </div>
                            </div>

                            {/* Attendees Section */}
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 border-b border-zinc-800/60 pb-6">
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                            <Users className="w-5 h-5 text-blue-500" /> Manifest Attendees
                                        </h4>
                                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                            {details.students?.length || 0} Entities detected in proximity
                                        </p>
                                    </div>

                                    <div className="relative group/search">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within/search:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="FILTER: SUBJECT NAME"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-zinc-950 border border-zinc-800 rounded-none px-10 py-2.5 text-[10px] font-mono text-white outline-none focus:border-blue-500/50 w-full sm:w-60 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {attendees.map((student: any) => (
                                        <div
                                            key={student.id}
                                            onClick={() => {
                                                onClose();
                                                router.push(`/students/${student.id}`);
                                            }}
                                            className="flex items-center gap-4 p-4 bg-black/40 border border-zinc-800/60 hover:border-blue-500/30 cursor-pointer transition-all group/s"
                                        >
                                            <Avatar className="h-12 w-12 rounded-none border border-zinc-800 grayscale group-hover/s:grayscale-0 transition-all">
                                                <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image`} />
                                                <AvatarFallback className="bg-zinc-900 text-zinc-500 text-sm font-black rounded-none">?</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white group-hover/s:text-blue-400 transition-colors uppercase truncate">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                                    {student.promo || "UNKNOWN_LEVEL"}
                                                </p>
                                            </div>
                                            <div className="ml-auto opacity-0 group-hover/s:opacity-100 transition-opacity">
                                                <Activity className="w-3 h-3 text-blue-500" />
                                            </div>
                                        </div>
                                    ))}
                                    {attendees.length === 0 && (
                                        <div className="col-span-full py-16 text-center bg-black/20 border border-dashed border-zinc-800">
                                            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">No subjects match the filter criteria</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-zinc-600 font-mono text-[10px] uppercase tracking-widest h-full flex flex-col items-center justify-center">
                            <X className="w-12 h-12 mb-4 opacity-10" />
                            Data Retrieval Fault
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
