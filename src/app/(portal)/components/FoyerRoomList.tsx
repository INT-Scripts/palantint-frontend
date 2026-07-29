"use client";

import { FoyerRoomDetail } from "./FoyerRoomDetailCard";

interface FoyerRoomListProps {
  rooms: FoyerRoomDetail[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
}

export default function FoyerRoomList({ rooms, selectedRoomId, onSelectRoom }: FoyerRoomListProps) {
  return (
    <div className="p-5 space-y-2.5">
      {rooms.map((room) => {
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
  );
}
