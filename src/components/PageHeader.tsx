import React, { ReactNode } from "react";
import { Search } from "lucide-react";

interface PageHeaderProps {
  badgeText: string;
  title1: string;
  title2: string;
  titleGradient: string;
  subtitle: string;
  colorName: "blue" | "emerald" | "orange";
  bottomContent?: ReactNode;
  rightContent?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchResults?: ReactNode;
}

const colorMap = {
  blue: {
    border: "border-blue-500",
    shadow: "shadow-[0_0_10px_rgba(59,130,246,0.8)]",
    bgPulse: "bg-blue-500",
  },
  emerald: {
    border: "border-emerald-500",
    shadow: "shadow-[0_0_10px_rgba(16,185,129,0.8)]",
    bgPulse: "bg-emerald-500",
  },
  orange: {
    border: "border-orange-500",
    shadow: "shadow-[0_0_10px_rgba(249,115,22,0.8)]",
    bgPulse: "bg-orange-500",
  }
};

export default function PageHeader({ 
  badgeText, title1, title2, titleGradient, subtitle, colorName, bottomContent, rightContent, searchPlaceholder, searchValue, onSearchChange, searchResults
}: PageHeaderProps) {
  const colors = colorMap[colorName];
  const hasRightContent = rightContent || searchPlaceholder;
  
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 lg:pb-12 ${hasRightContent ? 'border-b border-zinc-800' : ''}`}>
        <div className="flex flex-col items-start justify-center text-left space-y-4 md:space-y-6 max-w-5xl">
          <div className={`inline-flex items-center gap-3 px-3 md:px-4 py-1.5 bg-zinc-950/80 border-l-2 ${colors.border} backdrop-blur-md mb-2 shadow-2xl`}>
            <span className={`flex h-2 w-2 animate-pulse ${colors.bgPulse} ${colors.shadow}`} />
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
                    <div className="relative w-full group z-50">
                        <div className={`absolute inset-y-0 left-0 w-1 bg-zinc-800 group-focus-within:${colors.bgPulse} transition-colors z-20`} />
                        <Search className={`absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 transition-colors pointer-events-none z-10 ${colors.border.replace('border-', 'group-focus-within:text-')}`} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchValue || ''}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            className={`w-full h-16 bg-zinc-950/50 backdrop-blur-2xl border-y border-r border-l-0 border-zinc-800 rounded-none pl-16 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-600 shadow-inner focus-visible:ring-0 transition-all duration-500 hover:bg-zinc-900/80 outline-none ${colors.border.replace('border-', 'focus-visible:border-')}/50`}
                        />
                        {searchResults && (
                            <div className="absolute top-20 left-0 w-full bg-zinc-950/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl z-50">
                                {searchResults}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
