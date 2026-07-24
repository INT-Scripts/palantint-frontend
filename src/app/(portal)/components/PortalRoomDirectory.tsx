"use client";

import { Users, MapPin } from "lucide-react";
import PortalRoomDetailCard, { FoyerRoomDetail } from "./PortalRoomDetailCard";

interface PortalRoomDirectoryProps {
  rooms: FoyerRoomDetail[];
  activeFloor: string;
  selectedRoomId: string | null;
  roomMap: Record<string, FoyerRoomDetail>;
  onSelectRoom: (roomId: string | null) => void;
  loading?: boolean;
}

export default function PortalRoomDirectory({
  rooms,
  activeFloor,
  selectedRoomId,
  roomMap,
  onSelectRoom,
  loading = false,
}: PortalRoomDirectoryProps) {
  const selectedDetail = selectedRoomId ? roomMap[selectedRoomId] : null;

  return (
    <div className="w-full h-full lg:absolute lg:inset-0 bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-xs flex flex-col min-h-0 min-w-0">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
        <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
          <Users className="w-4 h-4 text-rose-500" />
          Répertoire Locaux — Étage {activeFloor}
        </h3>
        <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase font-bold">{rooms.length} Locaux</span>
      </div>

      {/* Selected Room Detail Specs Card */}
      {selectedDetail && (
        <div className="p-4 border-b border-zinc-200 dark:border-stone-800 shrink-0">
          <PortalRoomDetailCard
            room={selectedDetail}
            onClose={() => onSelectRoom(null)}
          />
        </div>
      )}

      {/* Scrollable Room List */}
      <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">Chargement...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
            <MapPin className="w-9 h-9 text-zinc-300 dark:text-stone-700" />
            <h3 className="font-bold text-sm text-zinc-700 dark:text-stone-300">Aucun local</h3>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rooms.map(room => {
              const isSelected = selectedRoomId === room.room_id;
              return (
                <div
                  key={room.room_id}
                  onClick={() => onSelectRoom(isSelected ? null : room.room_id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer font-mono flex items-center justify-between ${
                    isSelected
                      ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "bg-stone-50/70 dark:bg-stone-950/50 border-zinc-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-extrabold text-sm block tracking-wider">{room.room_id}</span>
                      <span className="text-xs text-zinc-500 dark:text-stone-400 truncate block">{room.club_name || room.raw_name || "Non attribué"}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-zinc-600 dark:text-stone-300 uppercase shrink-0">
                    {room.type || "Club"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
