"use client";

import { useEffect, useState, useRef } from "react";
import { ShieldCheck, Info } from "lucide-react";

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
        if (isMounted) {
          setSvgContent(text);
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
          const tooltipWidth = tooltipRef.current.offsetWidth || 260;
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
            const aptData = apartmentsMapRef.current[roomNum];
            
            const roomTitle = aptData?.Logement ? `Logement ${aptData.Logement}` : (aptData?.club_name || aptData?.raw_name || `Chambre ${roomNum}`);
            const bldg = aptData?.Bâtiment || building;
            const roomType = aptData?.Type || aptData?.type || "";
            const surf = parseNumeric(aptData?.Superficie);
            const baseRent = parseNumeric(aptData?.Tarif);
            const allocBoursier = parseNumeric(aptData?.["Allocation boursier"]);
            const allocNonBoursier = parseNumeric(aptData?.["Allocation non boursier"]);
            const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
            const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
            const origin = aptData?.association_of_origin || "";

            tooltipRef.current.innerHTML = `
              <div class="flex flex-col gap-2 font-mono text-xs text-stone-200">
                <div class="flex items-center justify-between border-b border-stone-800 pb-2 gap-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span class="font-extrabold text-white text-sm uppercase">${roomTitle}</span>
                  </div>
                  ${roomType ? `<span class="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">${roomType}</span>` : ""}
                </div>

                <div class="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div class="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                    <span class="text-[8px] text-stone-400 uppercase font-bold block">Localisation</span>
                    <span class="font-bold text-stone-100">${bldg} — F${floor}</span>
                  </div>

                  <div class="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                    <span class="text-[8px] text-stone-400 uppercase font-bold block">Superficie</span>
                    <span class="font-bold text-stone-100">${surf > 0 ? `${surf} m²` : (aptData?.Superficie || "N/A")}</span>
                  </div>
                </div>

                ${baseRent > 0 ? `
                  <div class="p-2 bg-amber-500/10 rounded-xl border border-amber-500/30 flex justify-between items-center text-[10px]">
                    <span class="text-amber-400 uppercase font-bold">Loyer Brut</span>
                    <span class="font-extrabold text-amber-300 text-xs">${baseRent} €/mois</span>
                  </div>

                  <div class="grid grid-cols-2 gap-1.5 text-[9px]">
                    <div class="bg-emerald-950/60 p-2 rounded-xl border border-emerald-800/50 flex flex-col gap-0.5">
                      <span class="text-emerald-400 font-bold uppercase text-[8px]">Boursier</span>
                      <span class="font-bold text-emerald-300 text-xs">${netBoursier > 0 ? `${netBoursier} €` : "—"}</span>
                      <span class="text-[7.5px] text-emerald-500/80">(-${allocBoursier}€ APL)</span>
                    </div>

                    <div class="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex flex-col gap-0.5">
                      <span class="text-stone-400 font-bold uppercase text-[8px]">Non-Boursier</span>
                      <span class="font-bold text-stone-200 text-xs">${netNonBoursier > 0 ? `${netNonBoursier} €` : "—"}</span>
                      <span class="text-[7.5px] text-stone-500">(-${allocNonBoursier}€ APL)</span>
                    </div>
                  </div>
                ` : ""}

                ${origin ? `<div class="text-[9px] text-stone-400 uppercase border-t border-stone-800 pt-1.5">Assoc: <span class="text-stone-200 font-bold">${origin}</span></div>` : ""}
                <div class="text-[8px] text-stone-500 uppercase tracking-widest pt-0.5">Ref: ${roomNum}</div>
              </div>
            `;
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
      if (tooltipRef.current) {
        tooltipRef.current.style.display = "none";
      }
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("click", handleClick);
    el.addEventListener("mouseleave", handleMouseLeave);

    if (tooltipRef.current) {
      tooltipRef.current.style.display = "none";
    }

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("click", handleClick);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [svgContent]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !svgContent) return;

    const apply = () => {
      el.querySelectorAll("a[data-room]").forEach((a) => {
        const roomNum = a.getAttribute("data-room") || "";
        const isSelected = roomNum === selectedRoomId;
        const isFoyer = building === "Foyer";
        const hasMeta = isFoyer || filteredRoomIds.size === 0 ? true : filteredRoomIds.has(roomNum);

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
  }, [svgContent, selectedRoomId, filteredRoomIds]);

  return (
    <div className="relative w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs flex flex-col flex-1 min-h-[580px] lg:min-h-[720px]">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
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

      {/* SVG Map Container */}
      <div
        ref={svgRef}
        className="flex-1 flex flex-col overflow-hidden relative z-0 p-3 sm:p-5 w-full select-none items-center justify-center min-h-0"
      >
        {loading ? (
          <div className="m-auto flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest">
              Chargement du plan...
            </span>
          </div>
        ) : error ? (
          <div className="m-auto flex flex-col items-center justify-center text-center p-6 gap-2 py-16">
            <Info className="w-8 h-8 text-amber-500" />
            <span className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
              {error}
            </span>
          </div>
        ) : (
          <div className="w-full h-full flex-1 flex items-center justify-center min-h-0">
            <div
              className="w-full h-full flex items-center justify-center
                         [&_svg]:w-full [&_svg]:max-w-full [&_svg]:h-full [&_svg]:max-h-[78vh] [&_svg]:block [&_svg]:m-auto [&_svg]:object-contain
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
        className="absolute z-50 pointer-events-none select-none bg-stone-950/95 backdrop-blur-xl border border-amber-500/50 p-4 rounded-2xl shadow-2xl hidden text-left transition-opacity duration-75 min-w-[260px]"
      />

    </div>
  );
}
