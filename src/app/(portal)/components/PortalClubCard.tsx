"use client";

import { Eye } from "lucide-react";
import { ClubLink } from "./PortalClubModal";

export interface Club {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  type?: string;
  association_of_origin?: string;
  color_primary?: string;
  foyer_room?: string;
  links?: ClubLink[];
}

interface PortalClubCardProps {
  club: Club;
  onSelectClub: (club: Club) => void;
  getOriginBadgeStyle: (origin?: string) => string;
}

export default function PortalClubCard({ club, onSelectClub, getOriginBadgeStyle }: PortalClubCardProps) {
  const customColor = club.color_primary || "#f43f5e";

  return (
    <div
      onClick={() => onSelectClub(club)}
      className="group bg-white/80 dark:bg-stone-900/80 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
    >
      <div className="absolute top-0 left-0 w-full h-1 opacity-90 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: customColor }} />

      <div className="space-y-3 pt-1">
        <div className="flex items-start gap-3">
          {club.logo_url ? (
            <img src={club.logo_url} alt={club.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-zinc-200/80 dark:border-stone-700/60 shadow-2xs shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0 shadow-2xs" style={{ backgroundColor: customColor }}>
              {club.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-zinc-950 dark:text-stone-50 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{club.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${getOriginBadgeStyle(club.association_of_origin)}`}>
                {club.association_of_origin || "Independent"}
              </span>
              {club.type && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80">
                  {club.type}
                </span>
              )}
              {club.foyer_room && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Local {club.foyer_room}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-zinc-700 dark:text-stone-300 text-xs leading-relaxed line-clamp-3">
          {club.description || "No description provided."}
        </p>
      </div>

      <div className="border-t border-zinc-100 dark:border-stone-800/80 pt-3 mt-4 flex justify-between items-center text-[11px] font-mono text-zinc-400 dark:text-stone-500">
        <span className="lowercase truncate max-w-[120px]">@{club.slug || "general"}</span>
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
          Details <Eye className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
