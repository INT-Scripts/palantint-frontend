"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { Building2, Info, AlertTriangle, X, Users } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "./components/PublicFloorViewer";
import BuildingModel from "@/app/(palantint)/palantint/apartments/components/BuildingModel";
import PortalFloorSelector from "../components/PortalFloorSelector";

interface Apartment {
  Logement: string;
  Bâtiment: string;
  Etage: number | string;
  Type: string;
  Superficie: number;
  Tarif: number;
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
  if (bldg === "Foyer") return `/api/assets/plans/Foyer_${floor}.png`;
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

  const handleSelectBuilding = (b: string) => {
    setActiveBuilding(b);
    if (!BUILDINGS[b].find(f => f.value === activeFloor)) {
      setActiveFloor(BUILDINGS[b][0].value);
    }
  };

  const handleSelectFloor = (f: string) => {
    setActiveFloor(f);
    setSelectedRoomId(null);
  };

  const apartmentsList = useMemo(() => Object.values(apartments), [apartments]);

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

      {/* Building & Floor Selector (Top) */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={handleSelectBuilding}
        onSelectFloor={handleSelectFloor}
        accentColor="amber"
      />

      {/* TWO-COLUMN LAYOUT GRID (Matching Right Panel Height to Left SVG Map Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN (SVG Floor Map) */}
        <div className="lg:col-span-7 w-full flex flex-col">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={handleRoomSelect}
            apartmentsMap={apartments}
          />
        </div>

        {/* RIGHT COLUMN (Single Container Matching Map Height exactly via absolute inset) */}
        <div className="lg:col-span-5 w-full relative min-h-[450px] lg:min-h-0">
          <div className="w-full h-full lg:absolute lg:inset-0 bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs flex flex-col min-h-0 min-w-0">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
              <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                <Users className="w-4 h-4 text-amber-500" />
                Directory — {activeBuilding} Étage {activeFloor}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase font-bold">
                {currentFloorApartments.length} Logements
              </span>
            </div>

            {/* Selected Apartment Specs Card (if selected) */}
            {selectedRoomId && apartments[selectedRoomId] && (() => {
              const detail = apartments[selectedRoomId];
              const baseRent = parseNumeric(detail.Tarif);
              const allocBoursier = parseNumeric(detail["Allocation boursier"]);
              const allocNonBoursier = parseNumeric(detail["Allocation non boursier"]);
              const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
              const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
              const surf = parseNumeric(detail.Superficie);

              return (
                <div className="p-4 border-b border-zinc-200 dark:border-stone-800 shrink-0">
                  <div className="bg-white dark:bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="text-base font-extrabold font-mono text-zinc-950 dark:text-stone-50">
                          Logement {selectedRoomId}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-amber-500 text-white">
                          {detail.Type || "Chambre"}
                        </span>
                        <button
                          onClick={() => setSelectedRoomId(null)}
                          title="Désélectionner"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                        <span className="text-[9px] text-zinc-400 dark:text-stone-500 uppercase block font-bold">Localisation</span>
                        <span className="font-bold text-zinc-900 dark:text-stone-100">{detail.Bâtiment} — F{activeFloor}</span>
                      </div>

                      <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                        <span className="text-[9px] text-zinc-400 dark:text-stone-500 uppercase block font-bold">Superficie</span>
                        <span className="font-bold text-zinc-900 dark:text-stone-100">{surf > 0 ? `${surf} m²` : (detail.Superficie || "-")}</span>
                      </div>

                      <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 col-span-2 flex justify-between items-center">
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-bold">Loyer Brut (Base)</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">{baseRent > 0 ? `${baseRent} €/mois` : (detail.Tarif || "-")}</span>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase block font-bold">Boursier</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{netBoursier > 0 ? `${netBoursier} €` : "—"}</span>
                      </div>

                      <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-stone-800">
                        <span className="text-[9px] text-zinc-400 dark:text-stone-500 uppercase block font-bold">Non-Boursier</span>
                        <span className="font-bold text-zinc-900 dark:text-stone-100">{netNonBoursier > 0 ? `${netNonBoursier} €` : "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Scrollable Directory List */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
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
                <div className="space-y-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 dark:bg-stone-950 z-10">
                      <tr className="border-b border-zinc-200 dark:border-stone-800 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-stone-500">
                        <th className="py-2.5 px-3 font-bold">Logement</th>
                        <th className="py-2.5 px-3 font-bold">Type</th>
                        <th className="py-2.5 px-3 font-bold">Surface</th>
                        <th className="py-2.5 px-3 font-bold">Loyer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 dark:divide-stone-800/40 text-xs text-zinc-700 dark:text-stone-300 font-mono">
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

      </div>

      {/* Building & Floor Selector (Bottom) */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={handleSelectBuilding}
        onSelectFloor={handleSelectFloor}
        accentColor="amber"
      />

      {/* Section 2: Building Wireframe & Blueprint Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-200/80 dark:border-stone-800/80">
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs h-[500px] flex flex-col">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
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

        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs h-[500px] flex flex-col relative">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
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
