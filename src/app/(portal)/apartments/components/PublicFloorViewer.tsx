"use client";

import { useEffect, useState, useRef } from "react";
import { ShieldCheck, MousePointerClick, Info } from "lucide-react";

interface PublicFloorViewerProps {
  building: string;
  floor: string;
  selectedRoomId: string | null;
  filteredRoomIds: Set<string>;
  onSelectRoom: (roomId: string) => void;
  apartmentsMap: Record<string, any>;
}

function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function PublicFloorViewer({
  building,
  floor,
  selectedRoomId,
  filteredRoomIds,
  onSelectRoom,
  apartmentsMap,
}: PublicFloorViewerProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredRoomRef = useRef<string | null>(null);

  const apartmentsMapRef = useRef(apartmentsMap);
  useEffect(() => {
    apartmentsMapRef.current = apartmentsMap;
  }, [apartmentsMap]);

  // Fetch SVG plan file and sanitize internal <style> tags that override CSS with !important
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchSvg = async () => {
      try {
        const res = await fetch(`/api/assets/plans/${building}_${floor}.svg`);
        if (!res.ok) {
          throw new Error(`Floor plan unavailable for ${building} Level ${floor}`);
        }
        const text = await res.text();
        const cleanedText = text.replace(/<style[\s\S]*?<\/style>/gi, "");
        if (isMounted) {
          setSvgContent(cleanedText);
          setLoading(false);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || "Failed to load floor plan SVG.");
          setSvgContent("");
          setLoading(false);
        }
      }
    };

    fetchSvg();

    return () => {
      isMounted = false;
    };
  }, [building, floor]);

  // Direct DOM event listeners for zero-lag hover & tooltips
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !svgContent) return;

    const handleMouseMove = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("a[data-room]");
      if (link) {
        const roomNum = link.getAttribute("data-room") || "";

        if (tooltipRef.current) {
          tooltipRef.current.style.display = "block";

          const rect = el.getBoundingClientRect();
          const tooltipWidth = tooltipRef.current.offsetWidth || 240;
          const tooltipHeight = tooltipRef.current.offsetHeight || 220;

          let x = e.clientX - rect.left + 16;
          let y = e.clientY - rect.top + 16;

          if (x + tooltipWidth > rect.width - 12) {
            x = Math.max(12, e.clientX - rect.left - tooltipWidth - 16);
          }
          if (y + tooltipHeight > rect.height - 12) {
            y = Math.max(12, e.clientY - rect.top - tooltipHeight - 16);
          }

          tooltipRef.current.style.left = `${x}px`;
          tooltipRef.current.style.top = `${y}px`;

          if (hoveredRoomRef.current !== roomNum) {
            if (hoveredRoomRef.current) {
              const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
              if (prev) prev.removeAttribute("data-hover");
            }
            link.setAttribute("data-hover", "true");
            hoveredRoomRef.current = roomNum;

            const detail = apartmentsMapRef.current[roomNum];
            if (detail) {
              const baseRent = parseNumeric(detail.Tarif);
              const allocBoursier = parseNumeric(detail["Allocation boursier"]);
              const allocNonBoursier = parseNumeric(detail["Allocation non boursier"]);

              const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
              const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
              const surf = parseNumeric(detail.Superficie);

              tooltipRef.current.innerHTML = `
                <div class="flex flex-col gap-2 font-mono">
                  <div class="flex items-center justify-between gap-4 border-b border-stone-800 pb-1.5">
                    <div class="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-amber-400"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      <span class="text-xs font-black text-white tracking-wider">LOGEMENT_${roomNum}</span>
                    </div>
                    <span class="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                      ${detail.Type || "Chambre"}
                    </span>
                  </div>
                  
                  <div class="mt-1 pt-1 border-t border-stone-800/80 flex flex-col gap-1.5">
                    <div class="grid grid-cols-2 gap-1 text-[9px]">
                      <div class="flex flex-col p-1 bg-stone-900/80 border border-stone-800">
                        <span class="text-[7px] text-stone-500 uppercase font-bold">Type</span>
                        <span class="font-bold text-white uppercase truncate">${detail.Type || "-"}</span>
                      </div>
                      <div class="flex flex-col p-1 bg-stone-900/80 border border-stone-800">
                        <span class="text-[7px] text-stone-500 uppercase font-bold">Superficie</span>
                        <span class="font-bold text-white">${surf > 0 ? `${surf} m²` : (detail.Superficie || "-")}</span>
                      </div>
                    </div>
                    
                    <div class="flex justify-between items-center p-1.5 bg-amber-500/10 border border-amber-500/20 text-[10px]">
                      <span class="text-stone-300 uppercase font-bold">Loyer Brut</span>
                      <span class="font-black text-amber-400">${baseRent > 0 ? `${baseRent} €/m` : (detail.Tarif || "-")}</span>
                    </div>
                    
                    <div class="flex flex-col gap-0.5 bg-stone-900/90 border border-stone-800 p-1.5 text-[9px]">
                      <div class="flex justify-between items-center gap-3 text-emerald-400">
                        <span>Boursier:</span>
                        <span class="font-bold">${netBoursier > 0 ? `${netBoursier} €` : "-"} <span class="text-[7.5px] text-stone-500 font-normal">(-${allocBoursier}€ APL)</span></span>
                      </div>
                      <div class="flex justify-between items-center gap-3 text-stone-300">
                        <span>Non-Boursier:</span>
                        <span class="font-bold">${netNonBoursier > 0 ? `${netNonBoursier} €` : "-"} <span class="text-[7.5px] text-stone-500 font-normal">(-${allocNonBoursier}€ APL)</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else {
              tooltipRef.current.innerHTML = `
                <div class="flex flex-col gap-1 font-mono">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-black text-white tracking-wider">LOGEMENT_${roomNum}</span>
                    <span class="text-[8px] font-bold px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">
                      Sans fiche
                    </span>
                  </div>
                  <span class="text-[9px] text-stone-400">Données non répertoriées</span>
                </div>
              `;
            }
          }
        }
      } else {
        if (hoveredRoomRef.current !== null) {
          const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
          if (prev) prev.removeAttribute("data-hover");
          hoveredRoomRef.current = null;
          if (tooltipRef.current) {
            tooltipRef.current.style.display = "none";
          }
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("a[data-room]");
      if (link) {
        e.preventDefault();
        const roomNum = link.getAttribute("data-room") || "";
        onSelectRoom(roomNum);
      }
    };

    const handleMouseLeave = () => {
      if (hoveredRoomRef.current) {
        const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
        if (prev) prev.removeAttribute("data-hover");
      }
      hoveredRoomRef.current = null;
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("click", handleClick);
    el.addEventListener("mouseleave", handleMouseLeave);

    if (tooltipRef.current) tooltipRef.current.style.display = "none";

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("click", handleClick);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [svgContent, onSelectRoom]);

  // Visual selection & missing-meta state sync
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !svgContent) return;

    const apply = () => {
      el.querySelectorAll("a[data-room]").forEach((a) => {
        const roomNum = a.getAttribute("data-room") || "";
        const isSelected = selectedRoomId === roomNum;
        const hasMeta = !!apartmentsMapRef.current[roomNum];

        if (isSelected) {
          a.setAttribute("data-selected", "true");
          a.setAttribute("data-active", "true");
        } else {
          a.removeAttribute("data-selected");
          a.removeAttribute("data-active");
        }

        if (!hasMeta) {
          a.setAttribute("data-no-meta", "true");
        } else {
          a.removeAttribute("data-no-meta");
        }
      });
    };

    apply();
    const raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [svgContent, selectedRoomId, apartmentsMap]);

  return (
    <div className="relative w-full h-full flex-1 min-h-[500px] lg:min-h-[800px] bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60">
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span className="font-extrabold text-stone-900 dark:text-stone-50 uppercase tracking-wider">
            {building} — Étage {floor} Plan Architectural
          </span>
        </div>
        
        {/* IntPortal Header Color Legend */}
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-stone-200 dark:bg-stone-500/20 border border-stone-300 dark:border-stone-400 rounded-2xs inline-block" />
            <span className="text-stone-900 dark:text-stone-200 font-bold">Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500/30 border border-rose-500 rounded-2xs inline-block" />
            <span className="text-stone-900 dark:text-stone-200 font-bold">Sans fiche</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-600/80 border border-blue-500 rounded-2xs inline-block" />
            <span className="text-stone-900 dark:text-stone-200 font-bold">Sélectionné</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-500/55 border border-blue-400 rounded-2xs inline-block" />
            <span className="text-stone-900 dark:text-stone-200 font-bold">Survol</span>
          </div>
        </div>
      </div>

      {/* SVG Container with Light / Dark Mode Selectors */}
      <div
        ref={svgRef}
        className="flex-1 flex overflow-auto relative z-0 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-800 h-full w-full select-none"
      >
        {loading ? (
          <div className="m-auto flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-9 h-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Chargement du plan...
            </span>
          </div>
        ) : error ? (
          <div className="m-auto flex flex-col items-center justify-center text-center p-6 gap-2 py-20">
            <Info className="w-8 h-8 text-amber-500" />
            <span className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
              {error}
            </span>
          </div>
        ) : (
          <div className="m-auto flex w-full h-full">
            <div
              className="m-auto flex w-full h-full
                         [&_svg]:m-auto [&_svg]:max-w-[95%] [&_svg]:max-h-[95%] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:block
                         [&_svg_path[stroke='white']]:stroke-stone-700! dark:[&_svg_path[stroke='white']]:stroke-stone-200!
                         [&_svg_path[stroke='#ffffff']]:stroke-stone-700! dark:[&_svg_path[stroke='#ffffff']]:stroke-stone-200!
                         [&_a[data-room]]:cursor-pointer!
                         [&_a[data-room]_text]:pointer-events-none!
                         [&_a[data-room]_tspan]:pointer-events-none!
                         [&_a[data-room]_.room-area]:pointer-events-all!
                         [&_a[data-room]_.room-area]:transition-all!
                         [&_a[data-room]_.room-area]:duration-150!
                         [&_.room-area]:fill-stone-200/60! [&_.room-area]:stroke-stone-300! dark:[&_.room-area]:fill-stone-500/15! dark:[&_.room-area]:stroke-stone-400/40!
                         [&_.room-area]:stroke-[1px]!
                         [&_.room-label]:font-sans!
                         [&_.room-label]:fill-stone-800! dark:[&_.room-label]:fill-stone-200!
                         [&_a[data-room][data-no-meta='true']_.room-area]:fill-rose-500/20!
                         [&_a[data-room][data-no-meta='true']_.room-area]:stroke-rose-500!
                         [&_a[data-room][data-no-meta='true']_.room-area]:stroke-[1.5px]!
                         [&_a[data-room][data-no-meta='true']_.room-label]:fill-rose-600! dark:[&_a[data-room][data-no-meta='true']_.room-label]:fill-rose-400!
                         [&_a[data-room][data-selected='true']_.room-area]:fill-blue-600/80!
                         [&_a[data-room][data-no-meta='true'][data-selected='true']_.room-area]:fill-blue-600/80!
                         [&_a[data-room][data-active='true']_.room-area]:fill-blue-600/80!
                         [&_a[data-room][data-no-meta='true'][data-active='true']_.room-area]:fill-blue-600/80!
                         [&_a[data-room][data-selected='true']_.room-area]:stroke-blue-500!
                         [&_a[data-room][data-no-meta='true'][data-selected='true']_.room-area]:stroke-blue-500!
                         [&_a[data-room][data-active='true']_.room-area]:stroke-blue-500!
                         [&_a[data-room][data-no-meta='true'][data-active='true']_.room-area]:stroke-blue-500!
                         [&_a[data-room][data-selected='true']_.room-area]:stroke-2!
                         [&_a[data-room][data-no-meta='true'][data-selected='true']_.room-area]:stroke-2!
                         [&_a[data-room][data-active='true']_.room-area]:stroke-2!
                         [&_a[data-room][data-no-meta='true'][data-active='true']_.room-area]:stroke-2!
                         [&_a[data-room]:hover_.room-area]:fill-blue-500/55!
                         [&_a[data-room][data-no-meta='true']:hover_.room-area]:fill-blue-500/55!
                         [&_a[data-room][data-hover='true']_.room-area]:fill-blue-500/55!
                         [&_a[data-room][data-no-meta='true'][data-hover='true']_.room-area]:fill-blue-500/55!
                         [&_a[data-room]:hover_.room-area]:stroke-blue-400!
                         [&_a[data-room][data-no-meta='true']:hover_.room-area]:stroke-blue-400!
                         [&_a[data-room][data-hover='true']_.room-area]:stroke-blue-400!
                         [&_a[data-room][data-no-meta='true'][data-hover='true']_.room-area]:stroke-blue-400!
                         [&_a[data-room]:hover_.room-area]:stroke-[2.5px]!
                         [&_a[data-room][data-no-meta='true']:hover_.room-area]:stroke-[2.5px]!
                         [&_a[data-room][data-hover='true']_.room-area]:stroke-[2.5px]!
                         [&_a[data-room][data-no-meta='true'][data-hover='true']_.room-area]:stroke-[2.5px]!
                         [&_a[data-room][data-selected='true']_.room-label]:fill-white!
                         [&_a[data-room][data-active='true']_.room-label]:fill-white!
                         [&_a[data-room][data-selected='true']_.room-label]:font-black!
                         [&_a[data-room][data-active='true']_.room-label]:font-black!
                         [&_a[data-room]:hover_.room-label]:fill-white!
                         [&_a[data-room]:hover_.room-label]:font-black!
                         [&_a[data-room][data-hover='true']_.room-label]:fill-white!
                         [&_a[data-room][data-hover='true']_.room-label]:font-black!"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        )}
      </div>

      {/* Container Relative Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-50 pointer-events-none select-none bg-stone-950/95 backdrop-blur-xl border border-amber-500/50 p-3.5 rounded-2xl shadow-2xl hidden text-left transition-opacity duration-75 min-w-[220px]"
      />

    </div>
  );
}
