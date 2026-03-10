"use client";

import React, { ReactNode, useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
    results?: ReactNode;
    id?: string;
    className?: string;
    inputClassName?: string;
    accentColorClass?: string;
    icon?: ReactNode;
    onFocus?: () => void;
    onBlur?: () => void;
}

export default function SearchBar({ 
    placeholder, value, onChange, results, id, className = "", inputClassName = "", accentColorClass = "group-focus-within:bg-blue-500", icon, onFocus, onBlur 
}: SearchBarProps) {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Synchronize local state with prop value if needed
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalValue(v);
        onChange(v);
    };

    return (
        <div className={cn("relative group h-12", className)}>
            {/* Visual Accent Bar */}
            <div className={cn("absolute inset-y-0 left-0 w-1 bg-zinc-800 transition-colors z-20", accentColorClass)} />
            
            {/* Icon */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                {icon || <Search className="h-5 w-5 text-zinc-600 transition-colors group-focus-within:text-white/80" />}
            </div>

            <input
                ref={inputRef}
                id={id}
                type="text"
                autoComplete="off"
                placeholder={placeholder}
                value={localValue}
                onChange={handleChange}
                onFocus={onFocus}
                onBlur={onBlur}
                className={cn(
                    "w-full h-full bg-zinc-950/50 backdrop-blur-2xl border-y border-r border-l-0 border-zinc-800 rounded-none pl-16 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-600 shadow-inner outline-none focus:bg-zinc-900/80 transition-all duration-300",
                    inputClassName
                )}
            />

            {results && (
                <div className="absolute top-[calc(100%+1px)] left-0 w-full bg-zinc-950/98 backdrop-blur-3xl border border-zinc-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] z-[100] animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                    {results}
                </div>
            )}
        </div>
    );
}
