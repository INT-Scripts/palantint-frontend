"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Building2, Euro, Maximize2, Search, SlidersHorizontal, Info, Check, AlertTriangle
} from "lucide-react";

interface Apartment {
  Logement: string; // e.g. "7104"
  Bâtiment: string; // e.g. "U7"
  Etage: number;
  Type: string; // e.g. "Chambre"
  Superficie: number; // e.g. 18.5
  Tarif: number; // e.g. 480
  "Allocation boursier": number;
  "Allocation non boursier": number;
  _req_b: boolean;
  _req_e: boolean;
}

export default function PublicApartmentsPage() {
  const [apartments, setApartments] = useState<Record<string, Apartment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minArea, setMinArea] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadApartmentDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/students/apartments/details");
        setApartments(data || {});
        
        // Find max price for slider defaults
        const apartmentsList = Object.values(data || {}) as Apartment[];
        if (apartmentsList.length > 0) {
          const max = Math.max(...apartmentsList.map(a => a.Tarif || 0));
          setMaxPrice(max + 10);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load apartment blueprints details.");
      } finally {
        setLoading(false);
      }
    };
    loadApartmentDetails();
  }, []);

  // Compute unique buildings and types for filter dropdowns
  const apartmentsList = useMemo(() => Object.values(apartments), [apartments]);

  const buildings = useMemo(() => {
    const bldgs = new Set<string>();
    apartmentsList.forEach(a => {
      if (a.Bâtiment) bldgs.add(a.Bâtiment.toUpperCase());
    });
    return Array.from(bldgs).sort();
  }, [apartmentsList]);

  const types = useMemo(() => {
    const tps = new Set<string>();
    apartmentsList.forEach(a => {
      if (a.Type) tps.add(a.Type);
    });
    return Array.from(tps).sort();
  }, [apartmentsList]);

  // Filtered list
  const filteredApartments = useMemo(() => {
    return apartmentsList.filter(apt => {
      // Search matches Logement number
      if (search && !apt.Logement.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Building filter
      if (selectedBuilding !== "ALL" && apt.Bâtiment.toUpperCase() !== selectedBuilding) {
        return false;
      }
      // Type filter
      if (selectedType !== "ALL" && apt.Type !== selectedType) {
        return false;
      }
      // Price limit
      if (apt.Tarif && apt.Tarif > maxPrice) {
        return false;
      }
      // Area limit
      if (apt.Superficie && apt.Superficie < minArea) {
        return false;
      }
      return true;
    }).sort((a, b) => a.Logement.localeCompare(b.Logement));
  }, [apartmentsList, search, selectedBuilding, selectedType, maxPrice, minArea]);

  return (
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 sm:py-16 relative z-10">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Maisel Accommodation Registry
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mt-1">
            Campus Housing
          </h1>
          <p className="text-zinc-500 dark:text-stone-400 text-sm sm:text-base mt-2 max-w-xl">
            Browse floor layout details, rooms sizes, standard pricing catalogs, and scholarship allocations for all residential buildings.
          </p>
        </div>
      </div>

      {/* Search and Quick Filters bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-stone-800/80 pb-6 mb-8">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search by room number (e.g. 7104)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 text-zinc-800 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/10 text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 ${
              showFilters 
                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                : "bg-white dark:bg-stone-900 border-zinc-200 dark:border-stone-800 text-zinc-600 dark:text-stone-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters Expandable Drawer */}
      {showFilters && (
        <div className="bg-white/60 dark:bg-stone-900/40 border border-zinc-200/60 dark:border-stone-800/50 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 transition-all duration-300">
          
          {/* Building Selector */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-stone-400 uppercase mb-2">
              Building
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-zinc-800 dark:text-stone-200 rounded-xl focus:outline-none text-sm transition-all"
            >
              <option value="ALL">All Buildings</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Room Type Selector */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-stone-400 uppercase mb-2">
              Room Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-zinc-800 dark:text-stone-200 rounded-xl focus:outline-none text-sm transition-all"
            >
              <option value="ALL">All Categories</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="md:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-stone-400 uppercase">
                Max Budget
              </label>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {maxPrice} €
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1000"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Min Area Slider */}
          <div className="md:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-stone-400 uppercase">
                Min Surface Area
              </label>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {minArea} m²
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={minArea}
              onChange={(e) => setMinArea(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Main Grid/Table block */}
      <div className="bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-4 sm:p-8 shadow-sm min-h-[300px] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Syncing Maisel registry...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">Telemetry Sync Failure</h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm font-mono">{error}</p>
          </div>
        ) : filteredApartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-zinc-400 dark:text-stone-500">
            <Info className="w-10 h-10" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">No Matches Found</h3>
            <p className="text-sm max-w-sm">No rooms matched your currently applied search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/60 dark:border-stone-800/60 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-stone-500">
                  <th className="py-4 px-4 font-bold">Room</th>
                  <th className="py-4 px-4 font-bold">Building</th>
                  <th className="py-4 px-4 font-bold">Type</th>
                  <th className="py-4 px-4 font-bold">Surface</th>
                  <th className="py-4 px-4 font-bold">Base Price</th>
                  <th className="py-4 px-4 font-bold">Scholarship Price</th>
                  <th className="py-4 px-4 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/40 dark:divide-stone-800/30 text-sm text-zinc-700 dark:text-stone-300">
                {filteredApartments.slice(0, 100).map((apt) => {
                  const scholarshipPrice = apt.Tarif && apt["Allocation boursier"] 
                    ? (apt.Tarif - apt["Allocation boursier"]).toFixed(2)
                    : null;

                  return (
                    <tr key={apt.Logement} className="hover:bg-white/40 dark:hover:bg-stone-950/20 transition-all group">
                      <td className="py-4 px-4 font-bold text-zinc-950 dark:text-stone-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {apt.Logement}
                      </td>
                      <td className="py-4 px-4 font-mono">
                        {apt.Bâtiment} // Floor {apt.Etage}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-zinc-100 dark:bg-stone-950 text-zinc-600 dark:text-stone-400 border border-zinc-200/50 dark:border-stone-850">
                          {apt.Type}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono">{apt.Superficie} m²</td>
                      <td className="py-4 px-4 font-bold font-mono text-zinc-900 dark:text-stone-250">
                        {apt.Tarif} €
                      </td>
                      <td className="py-4 px-4 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {scholarshipPrice ? `${scholarshipPrice} €` : "—"}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-zinc-400 dark:text-stone-500">
                        <div className="flex gap-2">
                          {apt._req_b && <span className="text-amber-500" title="Boursier priority">B</span>}
                          {apt._req_e && <span className="text-blue-500" title="Student status req">E</span>}
                          {!apt._req_b && !apt._req_e && <span className="text-zinc-300 dark:text-stone-750">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredApartments.length > 100 && (
              <div className="text-center py-4 border-t border-zinc-200/40 dark:border-stone-800/30 text-xs font-mono text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
                Showing first 100 matches of {filteredApartments.length} total rooms
              </div>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
