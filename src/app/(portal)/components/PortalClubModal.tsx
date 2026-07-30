"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, MapPin, X } from "lucide-react";

export interface ClubLink {
  name: string;
  url: string;
}

export interface ClubDetail {
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

interface PortalClubModalProps {
  club: ClubDetail | null;
  onClose: () => void;
  getOriginBadgeStyle: (origin?: string) => string;
}

export default function PortalClubModal({ club, onClose, getOriginBadgeStyle }: PortalClubModalProps) {
  const router = useRouter();
  if (!club) return null;

  const handleJumpToFoyer = () => {
    const roomId = club.foyer_room;
    onClose();
    router.push(`/foyer?room=${encodeURIComponent(roomId!)}`);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div onClick={onClose} className="fixed inset-0 bg-stone-950/60 backdrop-blur-md transition-opacity" />
      <div className="relative w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]">
        <div className="h-2 w-full shrink-0" style={{ backgroundColor: club.color_primary || "#f43f5e" }} />
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200/80 dark:border-stone-800 text-zinc-400 hover:text-zinc-950 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8 sm:p-10 overflow-y-auto space-y-8">
          <div className="flex items-center gap-6">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white p-2 border border-zinc-200/80 dark:border-stone-700 shrink-0 shadow-xs" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl text-white shrink-0 shadow-xs" style={{ backgroundColor: club.color_primary || "#f43f5e" }}>
                {club.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-1.5 min-w-0 flex-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-stone-50 leading-tight">{club.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md border ${getOriginBadgeStyle(club.association_of_origin)}`}>
                  {club.association_of_origin || "Independent"}
                </span>
                {club.type && (
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-700/80">{club.type}</span>
                )}
                {club.foyer_room && (
                  <button
                    onClick={handleJumpToFoyer}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    Foyer Local: {club.foyer_room}
                  </button>
                )}
              </div>
            </div>
          </div>
          {club.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">About</h3>
              <p className="text-zinc-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-line">{club.description}</p>
            </div>
          )}
          {club.links && club.links.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">Official Handles & Web</h3>
              <div className="flex flex-wrap gap-2">
                {club.links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200 border border-zinc-200/80 dark:border-stone-700/80 transition-all cursor-pointer">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
