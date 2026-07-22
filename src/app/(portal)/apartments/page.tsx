"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Building2, Search, SlidersHorizontal, Info, AlertTriangle, CheckCircle, Home, Check
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "./components/PublicFloorViewer";

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

const BUILDING_FLOORS_MAP: Record<string, string[]> = {
  U1: ["0", "1", "2", "3", "4", "5"],
  U2: ["1", "2", "3", "4", "5"],
  U3: ["0", "1", "2"],
  U4: ["1", "2", "3", "4", "5", "6"],
  U5: ["-0.5", "0.5", "1", "2", "3", "4"],
  U6: ["1", "2", "3"],
  U7: ["1", "2", "3", "4", "5", "6"],
};

export default function PublicApartmentsPage() {
  const [apartments, setApartments] = useState<Record<string, Apartment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Building & Floor selection state
  const [activeBuilding, setActiveBuilding] = useState<string>("U7");
  const [activeFloor, setActiveFloor] = useState<string>("1");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Catalog Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minArea, setMinArea] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const loadApartmentDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/students/apartments/details");
        setApartments(data || {});
        
        const apartmentsList = Object.values(data || {}) as Apartment[];
        if (apartmentsList.length > 0) {
          const max = Math.max(...apartmentsList.map(a => a.Tarif || 0));
          setMaxPrice(max + 10);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load apartment details.");
      } finally {
        setLoading(false);
      }
    };
    loadApartmentDetails();
  }, []);

  // Handle room selection (updates building/floor and scrolls to room row)
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const apt = apartments[roomId];
    if (apt) {
      if (apt.Bâtiment) {
        setActiveBuilding(apt.Bâtiment.toUpperCase());
      }
      if (apt.Etage !== undefined && apt.Etage !== null) {
        setActiveFloor(String(apt.Etage));
      }
    }

    setTimeout(() => {
      const row = document.getElementById(`room-row-${roomId}`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Available floors for active building
  const availableFloors = useMemo(() => {
    return BUILDING_FLOORS_MAP[activeBuilding] || ["1", "2", "3", "4", "5", "6"];
  }, [activeBuilding]);

  const apartmentsList = useMemo(() => Object.values(apartments), [apartments]);

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
      if (search && !apt.Logement.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (activeBuilding !== "ALL" && apt.Bâtiment.toUpperCase() !== activeBuilding) {
        return false;
      }
      if (activeFloor && String(apt.Etage) !== activeFloor) {
        return false;
      }
      if (selectedType !== "ALL" && apt.Type !== selectedType) {
        return false;
      }
      if (apt.Tarif && apt.Tarif > maxPrice) {
        return false;
      }
      if (apt.Superficie && apt.Superficie < minArea) {
        return false;
      }
      return true;
    }).sort((a, b) => a.Logement.localeCompare(b.Logement));
  }, [apartmentsList, search, activeBuilding, activeFloor, selectedType, maxPrice, minArea]);

  // Set of matching room IDs for highlighting on SVG floor map
  const filteredRoomIds = useMemo(() => {
    return new Set(filteredApartments.map(a => a.Logement));
  }, [filteredApartments]);

  // Currently selected room details object
  const selectedRoomObj = selectedRoomId ? apartments[selectedRoomId] : null;

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
      
      {/* Title Header */}
      <PortalHeader
        icon={<Building2 className="w-4 h-4" />}
        badgeText="Maisel Campus Housing"
        title="Interactive Floor Plans & Catalog"
        subtitle="Click any room on the floor map to view room details, surface area, and base/scholarship pricing."
        accentColor="amber"
      />

      {/* Control Bar: Building & Floor Selector */}
      <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-stone-800/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Building Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
              Building:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(BUILDING_FLOORS_MAP).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setActiveBuilding(b);
                    const floors = BUILDING_FLOORS_MAP[b];
                    if (floors && !floors.includes(activeFloor)) {
                      setActiveFloor(floors[0]);
                    }
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all ${
                    activeBuilding === b
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
              Floor:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableFloors.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={`px-3 py-1.5 text-xs font-bold font-mono rounded-xl transition-all ${
                    activeFloor === f
                      ? "bg-zinc-900 dark:bg-stone-100 text-white dark:text-zinc-950 shadow-sm"
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  Level {f}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-200/60 dark:border-stone-800/60">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search room (e.g. 7104)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value && apartments[e.target.value]) {
                  handleRoomSelect(e.target.value);
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-950 text-zinc-800 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
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

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="bg-stone-50/80 dark:bg-stone-950/40 border border-zinc-200/60 dark:border-stone-800/50 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300">
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-stone-400 uppercase mb-2">
                Room Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-zinc-800 dark:text-stone-200 rounded-xl focus:outline-none text-sm transition-all"
              >
                <option value="ALL">All Categories</option>
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
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

            <div>
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
      </div>

      {/* TWO-COLUMN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Interactive SVG Floor Plan Map */}
        <div className="lg:col-span-5 w-full sticky top-24">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={handleRoomSelect}
            apartmentsMap={apartments}
          />
        </div>

        {/* RIGHT COLUMN: Housing Catalog & Selected Room Details Card */}
        <div className="lg:col-span-7 w-full space-y-6">
          
          {/* Selected Room Details Feature Card (if a room is clicked) */}
          {selectedRoomObj && (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/40 rounded-2xl p-6 backdrop-blur-md transition-all animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                    Room {selectedRoomObj.Logement}
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-500 text-white">
                  {selectedRoomObj.Type || "Chambre"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-sm">
                <div className="bg-white/60 dark:bg-stone-900/60 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1">Building / Floor</span>
                  <span className="font-bold text-zinc-900 dark:text-stone-100">{selectedRoomObj.Bâtiment} — Level {selectedRoomObj.Etage}</span>
                </div>
                <div className="bg-white/60 dark:bg-stone-900/60 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1">Surface Area</span>
                  <span className="font-bold text-zinc-900 dark:text-stone-100">{selectedRoomObj.Superficie} m²</span>
                </div>
                <div className="bg-white/60 dark:bg-stone-900/60 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1">Standard Price</span>
                  <span className="font-bold text-zinc-900 dark:text-stone-100">{selectedRoomObj.Tarif} €/mo</span>
                </div>
                <div className="bg-white/60 dark:bg-stone-900/60 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1">Scholarship Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedRoomObj.Tarif && selectedRoomObj["Allocation boursier"]
                      ? `${(selectedRoomObj.Tarif - selectedRoomObj["Allocation boursier"]).toFixed(2)} €`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Housing Catalog Table */}
          <div className="bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[300px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/60 dark:border-stone-800/60">
              <div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-stone-50">
                  {activeBuilding} Level {activeFloor} Rooms
                </h2>
                <p className="text-xs text-zinc-500 dark:text-stone-400 font-mono">
                  {filteredApartments.length} matching rooms
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                  Loading catalog...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">Telemetry Sync Failure</h3>
                <p className="text-zinc-500 dark:text-stone-400 text-sm font-mono">{error}</p>
              </div>
            ) : filteredApartments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-zinc-400 dark:text-stone-500">
                <Info className="w-10 h-10" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-stone-100">No Matches Found</h3>
                <p className="text-xs max-w-sm">No rooms matched your currently applied search filters for {activeBuilding} Level {activeFloor}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto pr-1">
                <table ref={tableRef} className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-stone-100 dark:bg-stone-900 z-10">
                    <tr className="border-b border-zinc-200/60 dark:border-stone-800/60 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-stone-500">
                      <th className="py-3 px-3 font-bold">Room</th>
                      <th className="py-3 px-3 font-bold">Type</th>
                      <th className="py-3 px-3 font-bold">Surface</th>
                      <th className="py-3 px-3 font-bold">Base Price</th>
                      <th className="py-3 px-3 font-bold">Scholarship</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/40 dark:divide-stone-800/30 text-sm text-zinc-700 dark:text-stone-300">
                    {filteredApartments.map((apt) => {
                      const scholarshipPrice = apt.Tarif && apt["Allocation boursier"] 
                        ? (apt.Tarif - apt["Allocation boursier"]).toFixed(2)
                        : null;

                      const isSelected = selectedRoomId === apt.Logement;

                      return (
                        <tr 
                          key={apt.Logement} 
                          id={`room-row-${apt.Logement}`}
                          onClick={() => handleRoomSelect(apt.Logement)}
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? "bg-amber-500/15 dark:bg-amber-950/40 font-semibold border-l-4 border-amber-500"
                              : "hover:bg-white/60 dark:hover:bg-stone-950/40"
                          }`}
                        >
                          <td className="py-3.5 px-3 font-bold font-mono text-zinc-950 dark:text-stone-50">
                            <span className="flex items-center gap-2">
                              {apt.Logement}
                              {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 text-xs rounded-lg bg-zinc-100 dark:bg-stone-950 text-zinc-600 dark:text-stone-400 border border-zinc-200/50 dark:border-stone-800">
                              {apt.Type}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono">{apt.Superficie} m²</td>
                          <td className="py-3.5 px-3 font-bold font-mono text-zinc-900 dark:text-stone-200">
                            {apt.Tarif} €
                          </td>
                          <td className="py-3.5 px-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {scholarshipPrice ? `${scholarshipPrice} €` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </section>
  );
}
