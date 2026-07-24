"use client";

import { Briefcase } from "lucide-react";
import { PALETTE } from "@/lib/colors";

export interface PalantintClub {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  type?: string;
  association_of_origin?: string;
  color_primary?: string;
  foyer_room?: string;
}

interface PalantintClubCardProps {
  club: PalantintClub;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  getOriginBadgeStyle: (origin?: string) => string;
}

export default function PalantintClubCard({
  club,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  getOriginBadgeStyle,
}: PalantintClubCardProps) {
  const clubColor = club.color_primary || PALETTE.orga[500];

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 cursor-pointer transition-all duration-300 shadow-2xl flex flex-col overflow-hidden rounded-none"
      style={{
        borderColor: isHovered ? clubColor : "",
      }}
    >
      <div
        className="absolute top-0 right-0 w-1/3 h-1 transition-colors"
        style={{
          backgroundColor: clubColor + "33",
        }}
      />
      <div
        className="absolute top-0 right-0 w-1/3 h-1 transition-opacity opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: clubColor }}
      />

      <div className="flex items-center gap-6 p-6 border-b border-zinc-800/60 bg-zinc-900/30">
        <div
          className="w-16 h-16 bg-zinc-950 border border-zinc-800 flex flex-shrink-0 items-center justify-center overflow-hidden shadow-inner transition-colors z-10 rounded-none"
          style={{ borderColor: isHovered ? `${clubColor}80` : club.color_primary ? `${club.color_primary}50` : "" }}
        >
          {club.logo_url ? (
            <img
              src={club.logo_url}
              alt={club.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 rounded-none"
            />
          ) : (
            <Briefcase className="w-8 h-8 text-zinc-600 transition-colors" style={{ color: clubColor }} />
          )}
        </div>
        <div className="z-10 flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white leading-tight uppercase tracking-wider transition-colors truncate">
            {club.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border uppercase tracking-widest rounded-none ${getOriginBadgeStyle(club.association_of_origin)}`}>
              {club.association_of_origin || "INDEPENDENT"}
            </span>
            {club.type && (
              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase tracking-widest rounded-none">
                {club.type}
              </span>
            )}
            {club.foyer_room && (
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-widest rounded-none">
                LOCAL {club.foyer_room}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-6 flex-1 bg-zinc-950/20">
        <p className="text-zinc-400 text-xs leading-relaxed font-mono line-clamp-3 uppercase tracking-tight">
          {club.description || "NO_DESCRIPTION_AVAILABLE"}
        </p>
      </div>

      {/* Bottom Action Bar */}
      <div
        className="px-6 py-3 bg-zinc-900 border-t border-zinc-800/60 flex justify-between items-center transition-colors rounded-none"
        style={{ backgroundColor: isHovered ? `${clubColor}1a` : "" }}
      >
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Status: OPERATIONAL</span>
        <span
          className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: clubColor }}
        >
          ACCESS_DATA &gt;
        </span>
      </div>
    </div>
  );
}
