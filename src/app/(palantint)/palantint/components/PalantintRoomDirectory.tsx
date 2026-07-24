"use client";

import { Users } from "lucide-react";
import PalantintRoomDetailCard, { PalantintFoyerRoomDetail } from "./PalantintRoomDetailCard";

interface PalantintRoomDirectoryProps {
  rooms: PalantintFoyerRoomDetail[];
  floorLabel: string;
  selectedRoom: string | null;
  roomMap: Record<string, PalantintFoyerRoomDetail>;
  onSelectRoom: (roomId: string | null) => void;
  onNavigateToClub?: (clubId: string) => void;
  loading?: boolean;
}

export default function PalantintRoomDirectory({
  rooms,
  floorLabel,
  selectedRoom,
  roomMap,
  onSelectRoom,
  onNavigateToClub,
  loading = false,
}: PalantintRoomDirectoryProps) {
  const selectedDetail = selectedRoom ? roomMap[selectedRoom] : null;

  return (
    <div className="w-full h-full lg:absolute lg:inset-0 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col shadow-2xl relative rounded-none overflow-hidden min-w-0">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-black/20 shrink-0">
        <h3 className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
          <Users className="w-4 h-4 text-rose-500" />
          Locaux — {floorLabel}
        </h3>
        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
          {rooms.length} locaux
        </div>
      </div>

      {/* Selected Room Detail */}
      {selectedDetail && (
        <div className="shrink-0 border-b border-zinc-800">
          <PalantintRoomDetailCard
            room={selectedDetail}
            onClose={() => onSelectRoom(null)}
            onNavigateToClub={onNavigateToClub}
          />
        </div>
      )}

      {/* Room List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {rooms.length > 0 ? (
          rooms
            .slice()
            .sort((a, b) => a.club_name.localeCompare(b.club_name))
            .map((room) => {
              const isSelected = selectedRoom === room.room_id;
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
                      {room.club_name}
                    </span>
                    {room.type && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest ml-2 shrink-0">
                        {room.type}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase">
                    {room.raw_name || room.room_id}
                  </div>
                </div>
              );
            })
        ) : (
          <div className="p-10 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
            {loading ? "Loading assets..." : "No assets detected"}
          </div>
        )}
      </div>
    </div>
  );
}
