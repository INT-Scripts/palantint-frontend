"use client";

import { useEffect, useState } from "react";
import { fetchPublic } from "@/lib/api";
import { WashingMachine, RefreshCw, Euro, AlertTriangle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

const BUILDINGS = ["U3", "U4", "U5", "U6", "U7"];

interface Machine {
  machine_nbr: string;
  machine_price: string;
  machine_state: string; // "0" (available) or "1" (occupied)
  machine_type: string;  // "mal" (washer) or "sl" (dryer)
}

// Precomputed style sets per machine state, keyed by [isOccupied][isWasher],
// so the card markup below just looks up an object instead of repeating the
// same three-way ternary chain in five different places.
const CARD_STYLES = {
  occupied: {
    card: "border-zinc-200/50 dark:border-stone-850",
    badge: "bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
    iconWrap: "bg-zinc-100 dark:bg-stone-900 text-zinc-400 dark:text-stone-600",
  },
  washer: {
    card: "border-blue-100 hover:border-blue-300 dark:border-blue-950/30 dark:hover:border-blue-900/50",
    badge: "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    iconWrap: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  },
  dryer: {
    card: "border-amber-100 hover:border-amber-300 dark:border-amber-950/30 dark:hover:border-amber-900/50",
    badge: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    iconWrap: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  },
} as const;

function getMachineStyle(isOccupied: boolean, isWasher: boolean) {
  if (isOccupied) return CARD_STYLES.occupied;
  return isWasher ? CARD_STYLES.washer : CARD_STYLES.dryer;
}

export default function PublicLaundryPage() {
  const [selectedBuilding, setSelectedBuilding] = useState("U3");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      fetchPublic(`/laundry/${selectedBuilding.toLowerCase()}`)
        .then((data) => {
          if (cancelled) return;
          const sorted = (data || []).sort((a: Machine, b: Machine) => {
            if (a.machine_type !== b.machine_type) return a.machine_type === "mal" ? -1 : 1;
            return Number(a.machine_nbr) - Number(b.machine_nbr);
          });
          setMachines(sorted);
          setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message || "Could not load the machine list.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load(true);
    // Keep the list current while the page is open, without any visible
    // "sync" controls cluttering the UI.
    const timer = setInterval(() => load(false), 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selectedBuilding]);

  const availableCount = machines.filter(m => m.machine_state === "0").length;

  return (
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 sm:py-16 relative z-10">

      <PortalHeader
        icon={<WashingMachine className="w-4 h-4" />}
        badgeText="Laundry"
        title="Laundry"
        subtitle="Check which washing machines and dryers are free before heading over."
        accentColor="blue"
      />

      {/* Building selector */}
      <div className="flex flex-wrap items-center gap-2 mt-8 mb-6">
        {BUILDINGS.map(b => (
          <button
            key={b}
            onClick={() => setSelectedBuilding(b)}
            className={`px-4 py-1.5 text-sm font-medium border rounded-xl transition-all cursor-pointer active:scale-95 ${
              selectedBuilding === b
                ? "bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 shadow-sm"
                : "bg-white/40 dark:bg-stone-900/40 border-zinc-200/60 dark:border-stone-800/50 text-zinc-500 dark:text-stone-400 hover:text-zinc-800 dark:hover:text-stone-200"
            }`}
          >
            {b}
          </button>
        ))}
        {!loading && !error && machines.length > 0 && (
          <span className="ml-auto text-sm text-zinc-500 dark:text-stone-400">
            <span className="font-bold text-zinc-800 dark:text-stone-200">{availableCount}</span> of {machines.length} free
          </span>
        )}
      </div>

      <div className="bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-6 sm:p-10 shadow-sm min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-zinc-500 dark:text-stone-400 text-sm">{error}</p>
          </div>
        ) : machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-stone-500">
            <p className="text-sm">No machines found for building {selectedBuilding}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map(m => {
              const isWasher = m.machine_type === "mal";
              const isOccupied = m.machine_state !== "0";
              const style = getMachineStyle(isOccupied, isWasher);

              return (
                <div
                  key={`${m.machine_type}_${m.machine_nbr}`}
                  className={`border rounded-xl p-4 flex items-center gap-3 transition-all bg-white/40 dark:bg-stone-950/20 ${style.card}`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${style.iconWrap}`}>
                    <WashingMachine className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-stone-200">
                      {isWasher ? "Washer" : "Dryer"} #{m.machine_nbr}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-stone-500">
                      <Euro className="w-3 h-3" />
                      <span>{Number(m.machine_price) / 100} €</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${style.badge}`}>
                    {isOccupied ? "In use" : "Free"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
