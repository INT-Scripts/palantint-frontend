"use client";

import { X } from "lucide-react";

export interface FoyerClubSummary {
  club_id: string;
  club_name: string;
  logo_url?: string | null;
  description?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
}

export interface FoyerRoomDetail {
  room_id: string;
  raw_name: string;
  club_name: string;
  club_id?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
  floor: string;
  building: string;
  clubs?: FoyerClubSummary[];
}

interface FoyerRoomDetailCardProps {
  room: FoyerRoomDetail;
  onClose: () => void;
}

export default function FoyerRoomDetailCard({ room, onClose }: FoyerRoomDetailCardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-rose-500/80 rounded-3xl p-5 shadow-xs space-y-4 shrink-0">
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-lg font-extrabold font-mono text-zinc-950 dark:text-stone-50">Local {room.room_id}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-rose-600 text-white">{room.type || "Club"}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-stone-50 dark:bg-stone-950 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-stone-800 font-mono">
        <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1 font-bold">Club / Entité occupante</span>
        {room.clubs && room.clubs.length > 1 ? (
          <div className="flex flex-col gap-2">
            {room.clubs.map((c) => (
              <div key={c.club_id}>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 text-base block">{c.club_name}</span>
                {c.association_of_origin && <span className="text-xs text-zinc-500 dark:text-stone-400 block">Tutelle: {c.association_of_origin}</span>}
              </div>
            ))}
          </div>
        ) : (
          <>
            <span className="font-extrabold text-rose-600 dark:text-rose-400 text-base block">{room.club_name || room.raw_name || "Non attribué"}</span>
            {room.association_of_origin && <span className="text-xs text-zinc-500 dark:text-stone-400 mt-1 block">Tutelle: {room.association_of_origin}</span>}
          </>
        )}
      </div>
    </div>
  );
}
