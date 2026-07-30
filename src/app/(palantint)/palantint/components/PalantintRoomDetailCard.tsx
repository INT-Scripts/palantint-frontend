"use client";

import { Eye } from "lucide-react";
import PalantintDetailStatCard, { PalantintStatItem } from "./PalantintDetailStatCard";

export interface PalantintFoyerClubSummary {
  club_id: string;
  club_name: string;
  logo_url?: string | null;
  description?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
}

export interface PalantintFoyerRoomDetail {
  room_id: string;
  raw_name: string;
  club_name: string;
  club_id?: string | null;
  logo_url?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
  floor: string;
  building: string;
  clubs?: PalantintFoyerClubSummary[];
}

interface PalantintRoomDetailCardProps {
  room: PalantintFoyerRoomDetail;
  onClose: () => void;
  onNavigateToClub?: (clubId: string) => void;
}

export default function PalantintRoomDetailCard({ room, onClose, onNavigateToClub }: PalantintRoomDetailCardProps) {
  // Room specs (surface, capacity, ...) don't exist in the backend yet — the
  // grid reserves their spot for when Location.attributes grows those fields.
  const stats: PalantintStatItem[] = [
    { label: "Building", value: room.building || "—", valueClassName: "uppercase" },
    { label: "Floor", value: room.floor || "—" },
    { label: "Surface", value: "—" },
    { label: "Capacité", value: "—" },
  ];

  const clubs: PalantintFoyerClubSummary[] =
    room.clubs && room.clubs.length > 0
      ? room.clubs
      : room.club_id
      ? [{ club_id: room.club_id, club_name: room.club_name || room.raw_name || "Non attribué", logo_url: room.logo_url }]
      : [];

  const footer = clubs.length > 0 && (
    <div className="pt-2 border-t border-zinc-800/60 space-y-1.5 font-mono">
      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black block">
        {clubs.length > 1 ? "Clubs occupant ce local" : "Club occupant ce local"}
      </span>
      {clubs.map((c) => (
        <button
          key={c.club_id}
          onClick={() => onNavigateToClub && onNavigateToClub(c.club_id)}
          className="w-full text-left flex items-center gap-2.5 text-[11px] font-mono text-zinc-300 hover:text-rose-400 uppercase border border-zinc-800 p-1.5 bg-black/40 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          {c.logo_url ? (
            <img src={c.logo_url} alt={c.club_name} className="w-6 h-6 border border-zinc-800 object-contain bg-white shrink-0" />
          ) : (
            <span className="w-6 h-6 bg-rose-500/10 flex items-center justify-center text-[9px] font-black text-rose-400 shrink-0">
              {c.club_name.substring(0, 2).toUpperCase()}
            </span>
          )}
          <span className="flex-1 min-w-0 truncate">{c.club_name}</span>
          <Eye className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        </button>
      ))}
    </div>
  );

  return (
    <PalantintDetailStatCard
      accentColor="rose"
      title={`Local ${room.room_id}`}
      onClose={onClose}
      stats={stats}
      footer={footer}
    />
  );
}
