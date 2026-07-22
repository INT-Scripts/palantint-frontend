"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Building2, Info, AlertTriangle, X,
  Layers, FileText
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "./components/PublicFloorViewer";
import BuildingModel from "@/app/(palantint)/palantint/apartments/components/BuildingModel";

interface Apartment {
  Logement: string; // e.g. "7104"
  Bâtiment: string; // e.g. "U7"
  Etage: number | string;
  Type: string; // e.g. "Chambre"
  Superficie: number; // e.g. 18.5
  Tarif: number; // e.g. 480
  "Allocation boursier": number;
  "Allocation non boursier": number;
  _req_b: boolean;
  _req_e: boolean;
}

const BUILDINGS: Record<string, { label: string; value: string }[]> = {
  U1: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
  U2: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
  U3: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }],
  U4: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
  U5: [{ label: "RDC -", value: "-0.5" }, { label: "RDC +", value: "0.5" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }],
  U6: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }],
  U7: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
};

function getPngPath(bldg: string, floor: string) {
  let f = floor;
  if (bldg === "U5" && floor === "-0.5") f = "_-1";
  else if (bldg === "U5" && floor === "0.5") f = "_0";
  return `/api/assets/plans/${bldg}-${f}.png`;
}

function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function matchFloor(apt: Apartment, targetFloor: string): boolean {
  if (!targetFloor || targetFloor === "ALL") return true;
  const rawFloor = String(apt.Etage ?? "").trim();
  if (rawFloor === targetFloor) return true;
  const numApt = parseFloat(rawFloor);
  const numTarget = parseFloat(targetFloor);
  if (!isNaN(numApt) && !isNaN(numTarget) && numApt === numTarget) return true;
  if (targetFloor === "0") {
    const lower = rawFloor.toLowerCase();
    if (lower.includes("rdc") || lower.includes("rez")) return true;
  }
  const extracted = rawFloor.match(/-?\d+(\.\d+)?/);
  if (extracted && extracted[0] === targetFloor) return true;
  if (apt.Logement && apt.Logement.length === 4) {
    if (apt.Logement.charAt(1) === targetFloor) return true;
  }
  return false;
}

export default function PublicApartmentsPage() {
  const [apartments, setApartments] = useState<Record<string, Apartment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBuilding, setActiveBuilding] = useState<string>("U7");
  const [activeFloor, setActiveFloor] = useState<string>("1");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});
  const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadApartmentDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/students/apartments/details");
        setApartments(data || {});
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load apartment details.");
      } finally {
        setLoading(false);
      }
    };
    loadApartmentDetails();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const svgs: Record<string, string> = {};
      if (BUILDINGS[activeBuilding]) {
        await Promise.all(BUILDINGS[activeBuilding].map(async (f) => {
          try {
            const res = await fetch(`/api/assets/plans/${activeBuilding}_${f.value}.svg`);
            if (res.ok) {
              svgs[f.value] = await res.text();
            }
          } catch (e) {}
        }));
      }
      
      let meta: any = {};
      try {
        meta = await fetchPublic(`/maps/${activeBuilding}/metadata`);
      } catch(e) {}
      
      if (isMounted) {
        setBuildingSvgs(svgs);
        setBuildingMetadata(meta || {});
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [activeBuilding]);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const apt = apartments[roomId];
    if (apt) {
      if (apt.Bâtiment) {
        const b = apt.Bâtiment.toUpperCase();
        if (b !== activeBuilding && BUILDINGS[b]) {
          setActiveBuilding(b);
        }
      }
      const validFloors = (BUILDINGS[apt.Bâtiment?.toUpperCase() || activeBuilding] || []).map(f => f.value);
      let targetFloor: string | null = null;
      for (const f of validFloors) {
        if (matchFloor(apt, f)) {
          targetFloor = f;
          break;
        }
      }
      if (targetFloor && targetFloor !== activeFloor) {
        setActiveFloor(targetFloor);
      }
    }
  };

  const apartmentsList = useMemo(() => Object.values(apartments), [apartments]);

  // All apartments with data on active building & floor
  const currentFloorApartments = useMemo(() => {
    return apartmentsList
      .filter(apt => apt.Bâtiment?.toUpperCase() === activeBuilding && matchFloor(apt, activeFloor))
      .sort((a, b) => a.Logement.localeCompare(b.Logement));
  }, [apartmentsList, activeBuilding, activeFloor]);

  const filteredRoomIds = useMemo(() => {
    return new Set(currentFloorApartments.map(a => a.Logement));
  }, [currentFloorApartments]);

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
      
      {/* Title Header */}
      <PortalHeader
        icon={<Building2 className="w-4 h-4 text-amber-500" />}
        badgeText="Maisel Campus Housing"
        title="Interactive Floor Plans & Catalog"
        subtitle="Hover any room on the architectural map to view room details, surface area, and base/scholarship pricing."
        accentColor="amber"
      />

      {/* Control Bar: Building & Floor Selectors */}
      <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-stone-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Building Buttons */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
              Bâtiment:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(BUILDINGS).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setActiveBuilding(b);
                    if (!BUILDINGS[b].find(f => f.value === activeFloor)) {
                      setActiveFloor(BUILDINGS[b][0].value);
                    }
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
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
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
              Étage:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(BUILDINGS[activeBuilding] || []).map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setActiveFloor(f.value); setSelectedRoomId(null); }}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                    activeFloor === f.value
                      ? "bg-zinc-950 dark:bg-stone-100 text-white dark:text-zinc-950 shadow-sm"
                      : "bg-stone-100 dark:bg-stone-800/60 text-zinc-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* TWO-COLUMN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (SVG Floor Map) */}
        <div className="lg:col-span-7 w-full">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={handleRoomSelect}
            apartmentsMap={apartments}
          />
        </div>

        {/* RIGHT COLUMN (Selected Room Specs + Directory of All Apartments with Data) */}
        <div className="lg:col-span-5 w-full space-y-6">
          
          {/* Selected Apartment Specs Card */}
          {selectedRoomId && apartments[selectedRoomId] && (() => {
            const detail = apartments[selectedRoomId];
            const baseRent = parseNumeric(detail.Tarif);
            const allocBoursier = parseNumeric(detail["Allocation boursier"]);
            const allocNonBoursier = parseNumeric(detail["Allocation non boursier"]);

            const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
            const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
            const surf = parseNumeric(detail.Superficie);

            return (
              <div className="bg-white dark:bg-stone-900 border-2 border-amber-500/80 rounded-3xl p-5 shadow-sm transition-all space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-lg font-extrabold font-mono text-zinc-950 dark:text-stone-50">
                      Logement {selectedRoomId}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-500 text-white shadow-2xs">
                      {detail.Type || "Chambre"}
                    </span>
                    <button
                      onClick={() => setSelectedRoomId(null)}
                      title="Désélectionner"
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1 font-bold">
                      Localisation
                    </span>
                    <span className="font-extrabold text-zinc-900 dark:text-stone-100 text-sm">
                      {detail.Bâtiment} — Étage {activeFloor}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1 font-bold">
                      Superficie
                    </span>
                    <span className="font-extrabold text-zinc-900 dark:text-stone-100 text-sm">
                      {surf > 0 ? `${surf} m²` : (detail.Superficie || "-")}
                    </span>
                  </div>

                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase block font-bold">
                        Loyer Brut (Base)
                      </span>
                      <span className="text-[10px] text-zinc-400">Hors allocations</span>
                    </div>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base">
                      {baseRent > 0 ? `${baseRent} €/mois` : (detail.Tarif || "-")}
                    </span>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block mb-1 font-bold">
                      Loyer Net Boursier
                    </span>
                    <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-bold mb-0.5">
                      (-{allocBoursier}€ allocation)
                    </div>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      {netBoursier > 0 ? `${netBoursier} €/mois` : "—"}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1 font-bold">
                      Loyer Net Non-Boursier
                    </span>
                    <div className="text-[10px] text-zinc-400 font-bold mb-0.5">
                      (-{allocNonBoursier}€ allocation)
                    </div>
                    <span className="font-extrabold text-zinc-900 dark:text-stone-100 text-sm">
                      {netNonBoursier > 0 ? `${netNonBoursier} €/mois` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Directory of All Apartments with Data */}
          <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm min-h-[450px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/80 dark:border-stone-800 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950 dark:text-stone-50 font-mono">
                  {activeBuilding} — Étage {activeFloor} Logements
                </h2>
                <p className="text-xs text-zinc-500 dark:text-stone-400 font-mono">
                  {currentFloorApartments.length} logements répertoriés
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                  Chargement des logements...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2 flex-1">
                <AlertTriangle className="w-9 h-9 text-rose-500" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-stone-100">Erreur de chargement</h3>
                <p className="text-zinc-500 dark:text-stone-400 text-xs font-mono">{error}</p>
              </div>
            ) : currentFloorApartments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-zinc-400 dark:text-stone-500 flex-1">
                <Info className="w-8 h-8" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-stone-100">Aucun logement trouvé</h3>
                <p className="text-xs max-w-xs">Aucune donnée disponible pour cet étage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto pr-1 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-stone-100 dark:bg-stone-950 z-10">
                    <tr className="border-b border-zinc-200 dark:border-stone-800 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-stone-500">
                      <th className="py-2.5 px-3 font-bold">Logement</th>
                      <th className="py-2.5 px-3 font-bold">Type</th>
                      <th className="py-2.5 px-3 font-bold">Surface</th>
                      <th className="py-2.5 px-3 font-bold">Loyer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-stone-800/40 text-xs text-zinc-700 dark:text-stone-300">
                    {currentFloorApartments.map((apt) => {
                      const scholarshipPrice = apt.Tarif && apt["Allocation boursier"] 
                        ? (apt.Tarif - apt["Allocation boursier"]).toFixed(0)
                        : null;

                      const isSelected = selectedRoomId === apt.Logement;

                      return (
                        <tr 
                          key={apt.Logement} 
                          onClick={() => handleRoomSelect(apt.Logement)}
                          className={`cursor-pointer transition-all duration-150 ${
                            isSelected 
                              ? "bg-amber-500/20 dark:bg-amber-950/50 font-bold border-l-4 border-amber-500"
                              : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                          }`}
                        >
                          <td className="py-3 px-3 font-extrabold font-mono text-zinc-950 dark:text-stone-50">
                            <span className="flex items-center gap-1.5">
                              {apt.Logement}
                              {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <span className="px-2 py-0.5 text-[10px] rounded bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-800">
                              {apt.Type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">{apt.Superficie} m²</td>
                          <td className="py-3 px-3 font-mono">
                            <div className="font-bold text-zinc-900 dark:text-stone-100">{apt.Tarif} €</div>
                            {scholarshipPrice && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                {scholarshipPrice} € (boursier)
                              </div>
                            )}
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

      {/* Section 2: Building Wireframe & Blueprint Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-200/80 dark:border-stone-800/80">
        
        {/* 3D Skeleton Wireframe */}
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[600px] flex flex-col">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Bâtiment Wireframe 3D
          </h3>
          <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50">
            <BuildingModel
              bldg={activeBuilding}
              floors={BUILDINGS[activeBuilding] || []}
              activeFloor={activeFloor}
              buildingSvgs={buildingSvgs}
              buildingMetadata={buildingMetadata}
            />
          </div>
        </div>

        {/* Reference Blueprint Map PNG */}
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[600px] flex flex-col relative">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Plan Image de Référence
          </h3>
          <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50 flex items-center justify-center relative p-6">
            <a href={getPngPath(activeBuilding, activeFloor)} target="_blank" rel="noopener noreferrer" className="absolute inset-0 p-4">
              <img 
                src={getPngPath(activeBuilding, activeFloor)} 
                alt="Full Plan" 
                className="w-full h-full object-contain brightness-90 saturate-[0.8] contrast-125 hover:brightness-110 transition-all" 
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
              />
            </a>
          </div>
        </div>

      </div>

    </section>
  );
}
