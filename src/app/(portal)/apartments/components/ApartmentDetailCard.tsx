"use client";

import { X } from "lucide-react";
import { Apartment, parseNumeric } from "../types";

interface ApartmentDetailCardProps {
  apartment: Apartment;
  activeFloor: string;
  onClose: () => void;
}

export default function ApartmentDetailCard({ apartment, activeFloor, onClose }: ApartmentDetailCardProps) {
  const baseRent = parseNumeric(apartment.Tarif);
  const allocBoursier = parseNumeric(apartment["Allocation boursier"]);
  const allocNonBoursier = parseNumeric(apartment["Allocation non boursier"]);
  const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
  const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
  const surf = parseNumeric(apartment.Superficie);

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="text-base font-extrabold font-mono text-zinc-950 dark:text-stone-50">
            Logement {apartment.Logement}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-amber-500 text-white">
            {apartment.Type || "Chambre"}
          </span>
          <button
            onClick={onClose}
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
          <span className="font-bold text-zinc-900 dark:text-stone-100">{apartment.Bâtiment} — F{activeFloor}</span>
        </div>

        <div className="bg-stone-50 dark:bg-stone-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-stone-800">
          <span className="text-[9px] text-zinc-400 dark:text-stone-500 uppercase block font-bold">Superficie</span>
          <span className="font-bold text-zinc-900 dark:text-stone-100">{surf > 0 ? `${surf} m²` : (apartment.Superficie || "-")}</span>
        </div>

        <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 col-span-2 flex justify-between items-center">
          <span className="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-bold">Loyer Brut (Base)</span>
          <span className="font-extrabold text-amber-600 dark:text-amber-400">{baseRent > 0 ? `${baseRent} €/mois` : (apartment.Tarif || "-")}</span>
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
  );
}
