"use client";

import { X } from "lucide-react";

export interface PalantintFoyerRoomDetail {
  room_id: string;
  raw_name: string;
  club_name: string;
  club_id?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
  floor: string;
  building: string;
}

interface PalantintRoomDetailCardProps {
  room: PalantintFoyerRoomDetail;
  onClose: () => void;
  onNavigateToClub?: (clubId: string) => void;
}

export default function PalantintRoomDetailCard({
  room,
  onClose,
  onNavigateToClub,
}: PalantintRoomDetailCardProps) {
  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-950/70 space-y-3 shrink-0 rounded-none">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2 font-mono">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-sm font-black text-white uppercase">{room.club_name}</span>
        </div>
        <button
          onClick={onClose}
          title="Désélectionner"
          className="text-zinc-500 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="p-2 bg-zinc-900/80 border border-zinc-800">
          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Local</span>
          <span className="font-bold text-white uppercase">{room.raw_name || room.room_id}</span>
        </div>
        <div className="p-2 bg-zinc-900/80 border border-zinc-800">
          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Type</span>
          <span className="font-bold text-white uppercase">{room.type || "—"}</span>
        </div>
        {room.association_of_origin && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 col-span-2">
            <span className="text-[8px] font-mono text-zinc-300 uppercase block font-bold">Association d'origine</span>
            <span className="font-bold text-rose-400 text-xs">{room.association_of_origin}</span>
          </div>
        )}
        {room.club_id && onNavigateToClub && (
          <div className="col-span-2">
            <button
              onClick={() => onNavigateToClub(room.club_id!)}
              className="w-full text-left text-[10px] font-mono text-zinc-400 hover:text-rose-400 uppercase border border-zinc-800 p-1.5 bg-black/40 hover:bg-zinc-900 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Voir la fiche du club</span>
              <span className="text-rose-500 font-bold">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
