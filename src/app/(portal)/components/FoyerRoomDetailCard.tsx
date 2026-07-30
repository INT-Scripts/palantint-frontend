"use client";

import { Eye } from "lucide-react";
import DirectoryDetailCard, { PortalStatItem } from "./DirectoryDetailCard";

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
  logo_url?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
  floor: string;
  building: string;
  clubs?: FoyerClubSummary[];
}

interface FoyerRoomDetailCardProps {
  room: FoyerRoomDetail;
  onClose: () => void;
  onOpenClub?: (clubId: string) => void;
}

export default function FoyerRoomDetailCard({ room, onClose, onOpenClub }: FoyerRoomDetailCardProps) {
  // Room specs (surface, capacity, ...) don't exist in the backend yet — the
  // grid reserves their spot for when Location.attributes grows those fields.
  const stats: PortalStatItem[] = [
    { label: "Building", value: room.building || "—" },
    { label: "Floor", value: room.floor || "—" },
    { label: "Surface", value: "—" },
    { label: "Capacité", value: "—" },
  ];

  const clubs: FoyerClubSummary[] =
    room.clubs && room.clubs.length > 0
      ? room.clubs
      : room.club_id
      ? [{ club_id: room.club_id, club_name: room.club_name || room.raw_name || "Non attribué", logo_url: room.logo_url }]
      : [];

  const footer = clubs.length > 0 && (
    <div className="pt-1 space-y-2">
      <span className="text-[9px] font-mono uppercase block font-bold text-zinc-400 dark:text-stone-500">
        {clubs.length > 1 ? "Clubs occupant ce local" : "Club occupant ce local"}
      </span>
      <div className="space-y-1.5">
        {clubs.map((c) => (
          <button
            key={c.club_id}
            onClick={() => onOpenClub && onOpenClub(c.club_id)}
            className="w-full flex items-center gap-2.5 text-left border border-zinc-200/80 dark:border-stone-800 p-2 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-rose-400 dark:hover:border-rose-500/60 transition-colors cursor-pointer"
          >
            {c.logo_url ? (
              <img
                src={c.logo_url}
                alt={c.club_name}
                className="w-7 h-7 rounded-lg object-contain bg-white border border-zinc-200/60 dark:border-stone-700 shrink-0"
              />
            ) : (
              <span className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-[10px] font-black text-rose-500 shrink-0">
                {c.club_name.substring(0, 2).toUpperCase()}
              </span>
            )}
            <span className="flex-1 min-w-0 truncate font-bold font-mono text-xs uppercase text-zinc-800 dark:text-stone-200">
              {c.club_name}
            </span>
            <Eye className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DirectoryDetailCard
      accentColor="rose"
      title={`Local ${room.room_id}`}
      badge={room.type || undefined}
      onClose={onClose}
      stats={stats}
      footer={footer}
    />
  );
}
