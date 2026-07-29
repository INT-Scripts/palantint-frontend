"use client";

import { Apartment } from "../types";

interface ApartmentTableProps {
  apartments: Apartment[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function ApartmentTable({ apartments, selectedRoomId, onSelectRoom }: ApartmentTableProps) {
  return (
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
          {apartments.map((apt) => {
            const scholarshipPrice = apt.Tarif && apt["Allocation boursier"]
              ? (apt.Tarif - apt["Allocation boursier"]).toFixed(0)
              : null;

            const isSelected = selectedRoomId === apt.Logement;

            return (
              <tr
                key={apt.Logement}
                onClick={() => onSelectRoom(apt.Logement)}
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
  );
}
