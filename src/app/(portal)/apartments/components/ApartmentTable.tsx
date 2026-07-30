"use client";

import { Apartment, parseNumeric } from "../types";

interface ApartmentTableProps {
  apartments: Apartment[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function ApartmentTable({ apartments, selectedRoomId, onSelectRoom }: ApartmentTableProps) {
  return (
    <div className="p-5 space-y-2.5">
      {apartments.map((apt) => {
        const isSelected = selectedRoomId === apt.Logement;
        const baseRent = parseNumeric(apt.Tarif);
        const allocBoursier = parseNumeric(apt["Allocation boursier"]);
        const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : null;
        const surf = parseNumeric(apt.Superficie);

        return (
          <div
            key={apt.Logement}
            onClick={() => onSelectRoom(apt.Logement)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer font-mono flex items-center justify-between ${
              isSelected
                ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs"
                : "bg-stone-50/70 dark:bg-stone-950/50 border-zinc-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-sm block tracking-wider">{apt.Logement}</span>
                <span className="text-xs text-zinc-500 dark:text-stone-400 truncate block">
                  {apt.Type || "Chambre"} · {surf > 0 ? `${surf} m²` : apt.Superficie}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-zinc-600 dark:text-stone-300 uppercase block">
                {baseRent > 0 ? `${baseRent} €` : apt.Tarif}
              </span>
              {netBoursier !== null && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {netBoursier} € (boursier)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
