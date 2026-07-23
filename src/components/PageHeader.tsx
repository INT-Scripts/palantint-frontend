import React, { ReactNode } from "react";
import SearchBar from "@/components/ui/SearchBar";

interface PageHeaderProps {
  badgeText: string;
  title1: string;
  title2: string;
  titleGradient: string;
  subtitle: string;
  colorName: "student" | "orga" | "housing" | "zinc" | "campus" | "network" | "timetable" | "media" | "comms" | "rose";
  bottomContent?: ReactNode;
  rightContent?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchResults?: ReactNode;
}

const colorMap = {
  student: {
    border: "border-student-500",
    bg: "bg-student-500",
  },
  orga: {
    border: "border-orga-500",
    bg: "bg-orga-500",
  },
  housing: {
    border: "border-housing-500",
    bg: "bg-housing-500",
  },
  campus: {
    border: "border-campus-500",
    bg: "bg-campus-500",
  },
  network: {
    border: "border-network-500",
    bg: "bg-network-500",
  },
  zinc: {
    border: "border-zinc-500",
    bg: "bg-zinc-500",
  },
  timetable: {
    border: "border-timetable-500",
    bg: "bg-timetable-500",
  },
  media: {
    border: "border-media-500",
    bg: "bg-media-500",
  },
  comms: {
    border: "border-comms-500",
    bg: "bg-comms-500",
  },
  rose: {
    border: "border-rose-500",
    bg: "bg-rose-500",
  }
};

export default function PageHeader({ 
  badgeText, title1, title2, titleGradient, subtitle, colorName, bottomContent, rightContent, searchPlaceholder, searchValue, onSearchChange, searchResults
}: PageHeaderProps) {
  const colors = colorMap[colorName] || colorMap.zinc;
  const hasRightContent = rightContent || searchPlaceholder;
  
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 lg:pb-12 ${hasRightContent ? 'border-b border-zinc-800' : ''}`}>
        <div className="flex flex-col items-start justify-center text-left space-y-4 md:space-y-6 max-w-5xl">
          <div className={`inline-flex items-center gap-3 px-3 md:px-4 py-1.5 bg-zinc-950/80 border-l-2 ${colors.border} backdrop-blur-md mb-2`}>
            <span className={`flex h-2 w-2 ${colors.bg}`} />
            <span className="text-[10px] md:text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">{badgeText}</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] uppercase flex flex-col md:block items-start gap-1 mix-blend-difference">
            <span>{title1}</span> <br className="hidden md:block"/>
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${titleGradient}`}>
              {title2}
            </span>
          </h1>
          
          <p className="text-sm md:text-xl text-zinc-400 font-mono max-w-2xl leading-relaxed border-l border-zinc-800 pl-4">
            {subtitle}
          </p>

          {bottomContent && (
            <div className="w-full mt-6 md:mt-12">
                {bottomContent}
            </div>
          )}
        </div>
        
        {hasRightContent && (
            <div className="w-full md:w-[450px] lg:w-[500px] shrink-0 mb-2 relative">
                {rightContent}
                
                {searchPlaceholder && (
                    <SearchBar
                        id="page-header-filter-input"
                        placeholder={searchPlaceholder}
                        value={searchValue || ""}
                        onChange={(v) => onSearchChange?.(v)}
                        results={searchResults}
                        accentColorClass={`group-focus-within:${colors.bg}`}
                        className="h-14"
                        inputClassName="h-14"
                    />
                )}
            </div>
        )}
    </div>
  );
}
