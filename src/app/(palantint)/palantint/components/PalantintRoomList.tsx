"use client";

import { PalantintFoyerRoomDetail } from "./PalantintRoomDetailCard";

interface PalantintRoomListProps {
  rooms: PalantintFoyerRoomDetail[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
}

export default function PalantintRoomList({ rooms, selectedRoomId, onSelectRoom }: PalantintRoomListProps) {
  return (
    <div>
      {rooms
        .slice()
        .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }))
        .map((room) => {
          const isSelected = selectedRoomId === room.room_id;
          const clubNames = room.clubs && room.clubs.length > 0
            ? room.clubs.map((c) => c.club_name).join(", ")
            : room.club_name || room.raw_name || "Non attribué";
          const badge = room.clubs && room.clubs.length > 1 ? `${room.clubs.length} clubs` : room.type;

          return (
            <div
              key={room.room_id}
              className={`border-b border-zinc-800/30 p-4 transition-all cursor-pointer ${
                isSelected
                  ? "bg-rose-500/5 border-l-2 border-rose-500"
                  : "hover:bg-zinc-900/40 border-l-2 border-transparent"
              }`}
              onClick={() => onSelectRoom(isSelected ? null : room.room_id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono uppercase truncate">
                  {room.room_id}
                </span>
                {badge && (
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest ml-2 shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase truncate">
                {clubNames}
              </div>
            </div>
          );
        })}
    </div>
  );
}
