"use client";

import { useEffect, useState, useRef } from "react";
import { Info, ShieldCheck, CheckCircle2 } from "lucide-react";

interface PublicFloorViewerProps {
  building: string;
  floor: string;
  selectedRoomId: string | null;
  filteredRoomIds: Set<string>;
  onSelectRoom: (roomId: string) => void;
  apartmentsMap: Record<string, any>;
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

  // Hover state for room info tooltip
  const [hoveredRoom, setHoveredRoom] = useState<{
    id: string;
    x: number;
    y: number;
    details?: any;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch SVG plan file
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

  // Bind DOM events and styles to SVG room elements
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    // Ensure responsive SVG scaling within column
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.display = "block";

    // Query room anchor tags and room shape elements
    const roomContainers = containerRef.current.querySelectorAll<SVGElement>(
      "[data-room], a[id], g[id]"
    );

    roomContainers.forEach((container) => {
      const roomId =
        container.getAttribute("data-room") || container.getAttribute("id");
      if (!roomId || isNaN(Number(roomId))) return;

      const isFiltered = filteredRoomIds.has(roomId);
      const isSelected = selectedRoomId === roomId;

      // Make parent clickable and cursor pointer
      container.style.cursor = "pointer";

      // Query shapes inside room anchor
      const shapes = container.querySelectorAll<SVGElement>("polygon, rect, path");
      const targetShape = shapes.length > 0 ? shapes[0] : container;

      // Styling room polygons
      shapes.forEach((shape) => {
        shape.style.pointerEvents = "all"; // Fix click hitboxes on transparent fills
        shape.style.transition = "all 0.2s ease";

        if (isSelected) {
          shape.setAttribute("fill", "rgba(245, 158, 11, 0.45)"); // Amber glow
          shape.setAttribute("stroke", "#f59e0b");
          shape.setAttribute("stroke-width", "2.5");
        } else if (isFiltered) {
          shape.setAttribute("fill", "rgba(217, 119, 6, 0.15)");
          shape.setAttribute("stroke", "#d97706");
          shape.setAttribute("stroke-width", "1.5");
        } else {
          shape.setAttribute("fill", "rgba(120, 113, 108, 0.04)");
          shape.setAttribute("stroke", "rgba(120, 113, 108, 0.3)");
          shape.setAttribute("stroke-width", "1");
        }
      });

      // Mouse event listeners for click and hover
      const handleMouseEnter = (e: MouseEvent) => {
        shapes.forEach((shape) => {
          if (!isSelected) {
            shape.setAttribute("fill", "rgba(245, 158, 11, 0.35)");
            shape.setAttribute("stroke", "#f59e0b");
          }
        });

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setHoveredRoom({
            id: roomId,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            details: apartmentsMap[roomId],
          });
        }
      };

      const handleMouseLeave = () => {
        setHoveredRoom(null);
        shapes.forEach((shape) => {
          if (isSelected) {
            shape.setAttribute("fill", "rgba(245, 158, 11, 0.45)");
            shape.setAttribute("stroke", "#f59e0b");
          } else if (isFiltered) {
            shape.setAttribute("fill", "rgba(217, 119, 6, 0.15)");
            shape.setAttribute("stroke", "#d97706");
          } else {
            shape.setAttribute("fill", "rgba(120, 113, 108, 0.04)");
            shape.setAttribute("stroke", "rgba(120, 113, 108, 0.3)");
          }
        });
      };

      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectRoom(roomId);
      };

      container.addEventListener("mouseenter", handleMouseEnter as any);
      container.addEventListener("mouseleave", handleMouseLeave as any);
      container.addEventListener("click", handleClick as any);
    });
  }, [svgContent, filteredRoomIds, selectedRoomId, apartmentsMap, onSelectRoom]);

  return (
    <div className="relative w-full bg-white/80 dark:bg-stone-900/80 border border-zinc-200/80 dark:border-stone-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-950/40">
        <div className="flex items-center gap-2 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-zinc-900 dark:text-stone-100">
            {building} — Level {floor} Floor Plan
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
          Click any room
        </span>
      </div>

      {/* SVG Canvas Container */}
      <div
        className="relative flex-1 min-h-[400px] w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(120, 113, 108, 0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Rendering layout map...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-2 py-16">
            <Info className="w-8 h-8 text-amber-500" />
            <span className="text-sm font-bold text-zinc-800 dark:text-stone-200">
              {error}
            </span>
            <p className="text-xs text-zinc-400 dark:text-stone-500 max-w-xs">
              Select a different floor level or building above.
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[550px] [&_svg_path]:stroke-stone-700 dark:[&_svg_path]:stroke-stone-300 [&_svg_text]:fill-stone-800 dark:[&_svg_text]:fill-stone-200 [&_svg_text]:font-mono [&_svg_text]:font-bold"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}

        {/* Hover Tooltip */}
        {hoveredRoom && hoveredRoom.details && (
          <div
            className="absolute z-30 pointer-events-none bg-white/95 dark:bg-stone-900/95 border border-amber-500/50 shadow-xl rounded-xl p-3 text-xs backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-3 animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${hoveredRoom.x}px`,
              top: `${hoveredRoom.y}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-stone-800/80 pb-1.5 mb-1.5">
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                Room {hoveredRoom.id}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-stone-800 text-zinc-600 dark:text-stone-300">
                {hoveredRoom.details.Type || "Chambre"}
              </span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-zinc-600 dark:text-stone-300">
              <div className="flex justify-between gap-4">
                <span>Surface:</span>
                <span className="font-bold text-zinc-900 dark:text-stone-100">
                  {hoveredRoom.details.Superficie} m²
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Base Price:</span>
                <span className="font-bold text-zinc-900 dark:text-stone-100">
                  {hoveredRoom.details.Tarif} €/mo
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="px-4 py-2.5 border-t border-zinc-200/80 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-950/40 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-stone-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-amber-600 inline-block" />
            <span>Selected Room</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600/20 border border-amber-600/60 inline-block" />
            <span>Matching Search</span>
          </div>
        </div>
      </div>

    </div>
  );
}
