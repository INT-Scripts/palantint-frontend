"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { 
    WashingMachine, RefreshCw, Clock, Euro, ShieldAlert, 
    CheckCircle2, AlertTriangle, Activity, Database, Heart, Terminal
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

const BUILDINGS = ["U3", "U4", "U5", "U6", "U7"];

interface Machine {
    serial_number: string;
    machine_in_service: boolean;
    machine_name: string;
    machine_nbr: string;
    machine_price: string; // centimes, e.g. "400"
    machine_state: string; // "0" or "1"
    machine_type: string;  // "mal" or "sl"
    started_at: string | null;
    date_time: string;
    duration_estimate: string | null;
    detail: any;
    is_fictive_occupation: boolean;
    machine_state_fictive: boolean;
    special_val: string;
}

interface LogEntry {
    time: string;
    level: "INFO" | "SUCCESS" | "WARN";
    message: string;
}

export default function LaundryPage() {
    const [selectedBuilding, setSelectedBuilding] = useState("U3");
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = (level: "INFO" | "SUCCESS" | "WARN", message: string) => {
        const time = new Date().toLocaleTimeString("fr-FR");
        setLogs(prev => [{ time, level, message }, ...prev.slice(0, 14)]);
    };

    const loadLaundryData = async (building: string, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        if (!silent) addLog("INFO", `Initiating handshake with Hall ${building} controller...`);
        
        try {
            const data = await fetchAPI(`/laundry/${building.toLowerCase()}`);
            const sortedData = (data || []).sort((a: Machine, b: Machine) => {
                if (a.machine_type !== b.machine_type) {
                    return a.machine_type === "mal" ? -1 : 1;
                }
                return Number(a.machine_nbr) - Number(b.machine_nbr);
            });
            setMachines(sortedData);
            const now = new Date();
            setLastUpdated(now);
            if (!silent) addLog("SUCCESS", `Hall ${building} telemetry sync completed. Received ${sortedData.length} records.`);
        } catch (e: any) {
            console.error(e);
            const errMsg = e.message || "Link Synchronisation Fault";
            setError(errMsg);
            if (!silent) addLog("WARN", `Failed handshake with Hall ${building}: ${errMsg}`);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        document.title = "Laundry Room Monitor | PalantINT";
        // Seed initial system logs
        setLogs([
            { time: new Date().toLocaleTimeString("fr-FR"), level: "INFO", message: "PalantINT telemetry service started." },
            { time: new Date().toLocaleTimeString("fr-FR"), level: "INFO", message: "Connecting to Touch'n'Pay live socket proxy..." }
        ]);
        loadLaundryData(selectedBuilding);

        // Auto-refresh every 30 seconds
        const timer = setInterval(() => {
            loadLaundryData(selectedBuilding, true);
        }, 30000);

        return () => clearInterval(timer);
    }, [selectedBuilding]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        loadLaundryData(selectedBuilding);
    };

    // Calculate room stats
    const totalCount = machines.length;
    const occupiedCount = machines.filter(m => !!m.started_at).length;
    const availableCount = machines.filter(m => !m.started_at).length;
    const outOfServiceCount = 0; // Ignore machine_in_service as it is unreliable

    const malAvailable = machines.filter(m => m.machine_type === "mal" && !m.started_at).length;
    const malTotal = machines.filter(m => m.machine_type === "mal").length;
    const slAvailable = machines.filter(m => m.machine_type === "sl" && !m.started_at).length;
    const slTotal = machines.filter(m => m.machine_type === "sl").length;

    // Helper to format ISO Parisian time to elegant local view
    const formatCycleStart = (startedAt: string | null) => {
        if (!startedAt) return "N/A";
        try {
            const dt = new Date(startedAt);
            return dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
            return startedAt;
        }
    };

    // Helper to calculate elapsed time in minutes
    const getElapsedTime = (startedAt: string | null) => {
        if (!startedAt) return null;
        try {
            const start = new Date(startedAt).getTime();
            const now = new Date().getTime();
            const diffMin = Math.floor((now - start) / 60000);
            return diffMin > 0 ? diffMin : 0;
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-media-500/30 font-sans">
            {/* Atmospheric Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[25%] left-[-10%] w-[35%] h-[50%] bg-media-600/5 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[50%] bg-media-600/5 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-8">
                    
                    {/* Header */}
                    <PageHeader
                        badgeText="Live Touch'n'Pay Telemetry // Active"
                        title1="Laundry"
                        title2="Room Monitor"
                        titleGradient="from-media-400 to-media-600"
                        subtitle="Real-time operational monitoring of washing and drying machines across residential halls."
                        colorName="media"
                        rightContent={
                            <div className="flex items-center justify-end gap-4">
                                {lastUpdated && (
                                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-right">
                                        Last synced: <span className="text-zinc-300 font-bold">{lastUpdated.toLocaleTimeString("fr-FR")}</span>
                                    </div>
                                )}
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={isRefreshing}
                                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all rounded-none disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-media-500" : ""}`} />
                                    Synchronize Status
                                </button>
                            </div>
                        }
                    />

                    {/* Unified High-Density Control & Status Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-4 rounded-none">
                        {/* Compact Tab Selector */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mr-3">SELECT HALL:</span>
                            {BUILDINGS.map(b => (
                                <button
                                    key={b}
                                    onClick={() => setSelectedBuilding(b)}
                                    className={`px-5 py-2 font-mono text-xs font-black uppercase tracking-widest border transition-all duration-200 rounded-none ${
                                        selectedBuilding === b 
                                            ? "bg-media-500/10 text-media-400 border-media-500 shadow-[0_0_15px_rgba(217,70,239,0.15)]" 
                                            : "bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                                    }`}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>

                        {/* Telemetry Stats Summary */}
                        <div className="flex flex-wrap items-center gap-6 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500">TOTAL:</span>
                                <span className="text-white font-bold">{loading ? "---" : totalCount}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                                <span className="text-zinc-500">READY:</span>
                                <span className="text-emerald-400 font-bold">{loading ? "---" : availableCount}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                                <span className="text-zinc-500">ACTIVE:</span>
                                <span className="text-media-400 font-bold">{loading ? "---" : occupiedCount}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                                <span className="text-zinc-500">OFFLINE:</span>
                                <span className="text-red-400 font-bold">{loading ? "---" : outOfServiceCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Two-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* Left Side: Machines Grid (col-span-8 / 9) */}
                        <div className="col-span-12 lg:col-span-9 space-y-6">
                            {loading ? (
                                <div className="p-24 bg-zinc-900/20 border border-zinc-800/60 rounded-none flex flex-col items-center justify-center gap-4 text-center">
                                    <RefreshCw className="w-8 h-8 animate-spin text-media-500" />
                                    <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Querying Touch'n'Pay Hardware Controllers...</span>
                                </div>
                            ) : error ? (
                                <div className="p-16 bg-red-950/10 border border-red-500/20 rounded-none flex flex-col items-center justify-center gap-4 text-center">
                                    <AlertTriangle className="w-10 h-10 text-red-500" />
                                    <span className="font-mono text-xs text-red-400 uppercase tracking-widest font-black">Link Synchronisation Fault</span>
                                    <span className="text-sm text-zinc-400 max-w-md font-mono">{error}</span>
                                    <button
                                        onClick={handleManualRefresh}
                                        className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest rounded-none"
                                    >
                                        Retry Handshake
                                    </button>
                                </div>
                            ) : machines.length === 0 ? (
                                <div className="p-20 bg-zinc-900/20 border border-zinc-800/60 rounded-none flex flex-col items-center justify-center text-zinc-500 gap-4 font-mono uppercase tracking-widest text-center">
                                    <WashingMachine className="w-12 h-12 opacity-30 text-zinc-500" />
                                    <span className="text-xs">No machine assets configured for Hall {selectedBuilding}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {machines.map((m) => {
                                        const isAvailable = !m.started_at;
                                        const isOccupied = !!m.started_at;
                                        const isOffline = false; // Ignore machine_in_service as it is unreliable
                                        
                                        const priceEur = m.machine_price ? (Number(m.machine_price) / 100).toFixed(2) : "0.00";
                                        const isDryer = m.machine_type === "sl";
                                        const elapsedMin = getElapsedTime(m.started_at);

                                        return (
                                            <div 
                                                key={m.serial_number + "_" + m.machine_nbr} 
                                                className={`bg-zinc-900/40 backdrop-blur-xl border flex flex-col shadow-2xl relative rounded-none group transition-all duration-300 ${
                                                    isAvailable ? "border-zinc-850 hover:border-emerald-500/40" : isOccupied ? "border-zinc-850 hover:border-media-500/40" : "border-red-950/40 hover:border-red-500/30"
                                                }`}
                                            >
                                                {/* Top Indicator Glow Bar */}
                                                <div className={`absolute top-0 left-0 w-full h-[3px] transition-all duration-500 ${
                                                    isAvailable ? "bg-emerald-500" : isOccupied ? "bg-media-500" : "bg-red-600"
                                                }`} />

                                                {/* Card Header */}
                                                <div className="p-5 border-b border-zinc-800/40 flex items-start justify-between bg-zinc-950/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 border flex items-center justify-center transition-colors rounded-none ${
                                                            isAvailable ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : isOccupied ? "bg-media-500/5 text-media-400 border-media-500/20" : "bg-red-500/5 text-red-500 border-red-500/10"
                                                        }`}>
                                                            <WashingMachine className={`w-4.5 h-4.5 ${isOccupied ? "animate-pulse" : ""}`} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xs font-black text-white uppercase tracking-wider leading-tight">
                                                                {m.machine_name || (isDryer ? `DRYER ${m.machine_nbr}` : `WASHER ${m.machine_nbr}`)}
                                                            </h3>
                                                            <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                                                                {isDryer ? "Sèche-linge" : "Machine à laver"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Price badge */}
                                                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2 py-0.5 text-[9px] font-mono font-bold text-zinc-400 rounded-none">
                                                        <Euro className="w-2.5 h-2.5 text-media-400/70" />
                                                        <span>{priceEur} €</span>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-5 flex-1 space-y-4">
                                                    {/* Status row */}
                                                    <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2.5">
                                                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">STATUS</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                                isAvailable ? "bg-emerald-500 animate-pulse" : isOccupied ? "bg-media-500 animate-ping" : "bg-red-500"
                                                            }`} />
                                                            <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${
                                                                isAvailable ? "text-emerald-400" : isOccupied ? "text-media-400" : "text-red-500"
                                                            }`}>
                                                                {isAvailable ? "Available" : isOccupied ? "In Use" : "Out of Service"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Custom inner details */}
                                                    {isOccupied && (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 border border-zinc-800/30 p-3 font-mono text-[9px] rounded-none">
                                                                <div>
                                                                    <p className="text-zinc-500 uppercase tracking-widest mb-0.5">Started At</p>
                                                                    <p className="text-white font-bold flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 text-media-500/60" />
                                                                        {formatCycleStart(m.started_at)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-zinc-500 uppercase tracking-widest mb-0.5">Elapsed Time</p>
                                                                    <p className="text-white font-bold">
                                                                        {elapsedMin !== null ? `${elapsedMin} mins` : "Pending..."}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Progress bar visual indicator */}
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                                                                    <span>Cycle Progress</span>
                                                                    <span className="text-media-400 font-bold">Active</span>
                                                                </div>
                                                                <div className="w-full bg-zinc-950 border border-zinc-850 h-2 p-0.5 rounded-none">
                                                                    <div 
                                                                        className="bg-gradient-to-r from-media-600 to-media-400 h-full relative transition-all duration-1000" 
                                                                        style={{ width: `${Math.min(100, Math.max(15, (elapsedMin || 1) * 2.2))}%` }}
                                                                    >
                                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isOffline && (
                                                        <div className="p-3 bg-red-950/5 border border-red-500/10 font-mono text-[9px] text-red-400 uppercase tracking-widest flex items-center gap-2 rounded-none">
                                                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-500/50" />
                                                            <span>Controller is completely offline. Repair scheduled.</span>
                                                        </div>
                                                    )}

                                                    {isAvailable && (
                                                        <div className="p-3 bg-emerald-950/5 border border-emerald-500/10 font-mono text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-2 rounded-none">
                                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500/50" />
                                                            <span>Clear and ready for immediate loading.</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card Footer */}
                                                <div className="p-3.5 border-t border-zinc-800/30 flex justify-between items-center font-mono text-[8px] text-zinc-600 bg-zinc-950/10 uppercase tracking-wider rounded-none">
                                                    <span>SERIAL: {m.serial_number || "N/A"}</span>
                                                    <span>UNIT: {selectedBuilding}_{m.machine_nbr}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right Side: Operational Stats & Handshake Log Sidebar (col-span-4 / 3) */}
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            
                            {/* System Status Panel */}
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-5 rounded-none relative">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-media-500" />
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-media-500" /> Operational telemetry
                                </h3>

                                <div className="space-y-4">
                                    {/* Connection State */}
                                    <div className="flex items-center justify-between bg-zinc-950 p-3 border border-zinc-800 font-mono text-[10px] rounded-none">
                                        <span className="text-zinc-500">SOCKET STATE:</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                            CONNECTED
                                        </span>
                                    </div>

                                    {/* Breakdown bars */}
                                    <div className="space-y-3 font-mono text-[10px]">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-zinc-400">
                                                <span>WASHERS (MAL):</span>
                                                <span className="text-white font-bold">{loading ? "---" : `${malAvailable} / ${malTotal} READY`}</span>
                                            </div>
                                            <div className="w-full bg-zinc-950 border border-zinc-850 h-1.5 rounded-none overflow-hidden">
                                                <div 
                                                    className="bg-emerald-500 h-full transition-all" 
                                                    style={{ width: loading ? "0%" : `${malTotal > 0 ? (malAvailable / malTotal) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-zinc-400">
                                                <span>DRYERS (SL):</span>
                                                <span className="text-white font-bold">{loading ? "---" : `${slAvailable} / ${slTotal} READY`}</span>
                                            </div>
                                            <div className="w-full bg-zinc-950 border border-zinc-850 h-1.5 rounded-none overflow-hidden">
                                                <div 
                                                    className="bg-emerald-500 h-full transition-all" 
                                                    style={{ width: loading ? "0%" : `${slTotal > 0 ? (slAvailable / slTotal) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Help Desk & Rates */}
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-5 rounded-none relative">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Euro className="w-4 h-4 text-media-500" /> Payment & Rates
                                </h3>
                                <div className="space-y-3 font-mono text-[9px] text-zinc-400 leading-relaxed uppercase">
                                    <div className="flex justify-between border-b border-zinc-800/50 pb-1.5">
                                        <span>Standard Wash (MAL):</span>
                                        <span className="text-white font-bold">4.00 €</span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-800/50 pb-1.5">
                                        <span>Standard Dry (SL):</span>
                                        <span className="text-white font-bold">0.00 €</span>
                                    </div>
                                    <p className="text-[8px] text-zinc-500 lowercase normal-case leading-normal mt-2">
                                        Payment is handled touchless via Touch'n'Pay system. Load credits at any residence payment terminal.
                                    </p>
                                </div>
                            </div>

                            {/* Interactive Micro Console Log */}
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-5 rounded-none relative">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-media-500" /> Console logs
                                </h3>
                                <div className="bg-zinc-950 border border-zinc-850 p-3 h-[180px] overflow-y-auto font-mono text-[8px] space-y-1.5 custom-scrollbar rounded-none select-none">
                                    {logs.map((log, i) => (
                                        <div key={i} className="leading-relaxed">
                                            <span className="text-zinc-600 mr-1.5">[{log.time}]</span>
                                            <span className={`font-bold mr-1.5 ${
                                                log.level === "SUCCESS" ? "text-emerald-400" : log.level === "WARN" ? "text-red-500" : "text-media-400"
                                            }`}>
                                                {log.level}
                                            </span>
                                            <span className="text-zinc-300">{log.message}</span>
                                        </div>
                                    ))}
                                    {logs.length === 0 && (
                                        <div className="text-zinc-700 italic">Console ready...</div>
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
}
