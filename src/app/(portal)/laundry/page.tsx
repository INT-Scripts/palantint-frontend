"use client";

import { useEffect, useState } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  WashingMachine, RefreshCw, Clock, Euro, 
  CheckCircle2, AlertTriangle, Info
} from "lucide-react";

const BUILDINGS = ["U3", "U4", "U5", "U6", "U7"];

interface Machine {
  serial_number: string;
  machine_in_service: boolean;
  machine_name: string;
  machine_nbr: string;
  machine_price: string;
  machine_state: string; // "0" (available) or "1" (occupied)
  machine_type: string;  // "mal" (washer) or "sl" (dryer)
  started_at: string | null;
  date_time: string;
  duration_estimate: string | null;
  detail: any;
  is_fictive_occupation: boolean;
  machine_state_fictive: boolean;
  special_val: string;
}

export default function PublicLaundryPage() {
  const [selectedBuilding, setSelectedBuilding] = useState("U3");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLaundryData = async (building: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchPublic(`/laundry/${building.toLowerCase()}`);
      const sortedData = (data || []).sort((a: Machine, b: Machine) => {
        if (a.machine_type !== b.machine_type) {
          return a.machine_type === "mal" ? -1 : 1;
        }
        return Number(a.machine_nbr) - Number(b.machine_nbr);
      });
      setMachines(sortedData);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to fetch laundry room telemetry.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLaundryData(selectedBuilding);
    const timer = setInterval(() => {
      loadLaundryData(selectedBuilding, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedBuilding]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadLaundryData(selectedBuilding);
  };

  // Stats
  const washers = machines.filter(m => m.machine_type === "mal");
  const dryers = machines.filter(m => m.machine_type === "sl");

  const availableWashers = washers.filter(m => m.machine_state === "0").length;
  const availableDryers = dryers.filter(m => m.machine_state === "0").length;

  const formatCycleStart = (startedAt: string | null) => {
    if (!startedAt) return "N/A";
    try {
      const dt = new Date(startedAt);
      return dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return startedAt;
    }
  };

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
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 sm:py-16 relative z-10">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Live Telemetry Services
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mt-1">
            Laundry Monitor
          </h1>
          <p className="text-zinc-500 dark:text-stone-400 text-sm sm:text-base mt-2 max-w-xl">
            Real-time status of washing machines and dryers across all campus residential halls.
          </p>
        </div>
        <div className="flex items-center gap-4 self-start md:self-end">
          {lastUpdated && (
            <div className="text-[10px] font-mono text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Last synced: <span className="font-bold text-zinc-800 dark:text-stone-300">{lastUpdated.toLocaleTimeString("fr-FR")}</span>
            </div>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 border border-zinc-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 text-zinc-700 dark:text-stone-300 hover:text-zinc-950 dark:hover:text-white px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all rounded-xl disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
            Sync Status
          </button>
        </div>
      </div>

      {/* Hall Selector Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-zinc-200/80 dark:border-stone-800/80 pb-6 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 dark:text-stone-500 uppercase mr-2">
            Halls:
          </span>
          {BUILDINGS.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBuilding(b)}
              className={`px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border rounded-xl transition-all cursor-pointer active:scale-95 ${
                selectedBuilding === b 
                  ? "bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 shadow-sm" 
                  : "bg-white/40 dark:bg-stone-900/40 border-zinc-200/60 dark:border-stone-800/50 text-zinc-500 dark:text-stone-400 hover:text-zinc-800 dark:hover:text-stone-200"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Telemetry Stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <span>Washers Available:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
              {loading ? "..." : `${availableWashers}/${washers.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:border-l sm:border-zinc-200/80 dark:sm:border-stone-800/80 sm:pl-4">
            <span>Dryers Available:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-100/50 dark:border-amber-900/20">
              {loading ? "..." : `${availableDryers}/${dryers.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-6 sm:p-10 shadow-sm min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Connecting to Touch'n'Pay Hardware proxy...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">Telemetry Sync Failure</h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm max-w-md font-mono">{error}</p>
            <button
              onClick={handleManualRefresh}
              className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-stone-100 text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-zinc-400 dark:text-stone-500">
            <Info className="w-10 h-10" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">No Telemetry Available</h3>
            <p className="text-sm max-w-sm">No machine records were found for Hall {selectedBuilding}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map(m => {
              const isWasher = m.machine_type === "mal";
              const isOccupied = m.machine_state !== "0";
              const elapsed = getElapsedTime(m.started_at);

              return (
                <div 
                  key={`${m.machine_type}_${m.machine_nbr}`}
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden bg-white/40 dark:bg-stone-950/20 ${
                    isOccupied 
                      ? "border-zinc-200/50 dark:border-stone-850" 
                      : isWasher
                        ? "border-blue-100 hover:border-blue-300 dark:border-blue-950/30 dark:hover:border-blue-900/50"
                        : "border-amber-100 hover:border-amber-300 dark:border-amber-950/30 dark:hover:border-amber-900/50"
                  }`}
                >
                  {/* Service tag glow top indicator */}
                  <div className={`absolute top-0 left-0 w-full h-[3px] ${
                    isOccupied 
                      ? "bg-red-500/70 dark:bg-red-900/50" 
                      : isWasher 
                        ? "bg-blue-500/70" 
                        : "bg-amber-500/70"
                  }`} />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
                        #{m.machine_nbr} // {isWasher ? "WASHER" : "DRYER"}
                      </span>
                      <span className={`px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider rounded-md border ${
                        isOccupied
                          ? "bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30"
                          : isWasher
                            ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                            : "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                      }`}>
                        {isOccupied ? "Busy" : "Ready"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isOccupied 
                          ? "bg-zinc-100 dark:bg-stone-900 text-zinc-400 dark:text-stone-600" 
                          : isWasher 
                            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" 
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                      }`}>
                        <WashingMachine className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-800 dark:text-stone-200 leading-none">
                          {m.machine_name || (isWasher ? "Washing Machine" : "Dryer")}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-stone-500 mt-1 block">
                          S/N: {m.serial_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-stone-850 pt-3 mt-5 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-stone-500">
                    <div className="flex items-center gap-1">
                      <Euro className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{Number(m.machine_price) / 100} €</span>
                    </div>
                    {isOccupied ? (
                      <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>
                          {elapsed !== null ? `Started ${elapsed}m ago` : `Started at ${formatCycleStart(m.started_at)}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
