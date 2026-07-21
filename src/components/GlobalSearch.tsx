"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchPrivate, fetchPublic } from "@/lib/api";
import { User, Users, Home, ArrowRight, Loader2, Search, GraduationCap } from "lucide-react";
import SearchBar from "./ui/SearchBar";

interface SearchStudent {
    id: number;
    first_name: string;
    last_name: string;
    trombint_id: string;
    apartment?: string | null;
}

interface SearchClub {
    id: number;
    name: string;
    slug: string;
}

interface SearchClassGroup {
    id: number;
    name: string;
}

interface SearchApartment {
    apartment_id: string;
    student_name: string;
}

export default function GlobalSearch({ className = "", inputClassName = "" }: { className?: string, inputClassName?: string }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<{
        students: SearchStudent[];
        clubs: SearchClub[];
        class_groups: SearchClassGroup[];
        apartments: SearchApartment[];
    }>({students: [], clubs: [], class_groups: [], apartments: []});
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("palantint_token");
    const prefix = hasToken ? "/palantint" : "";

    useEffect(() => {
        if (!search || search.length < 2) {
            Promise.resolve().then(() => {
                setResults({students: [], clubs: [], class_groups: [], apartments: []});
            });
            return;
        }

        const timer = setTimeout(() => {
            setIsSearching(true);
            const fetchHelper = hasToken ? fetchPrivate : fetchPublic;
            fetchHelper(`/search?q=${search}`)
                .then(res => {
                    setResults(res || {students: [], clubs: [], class_groups: [], apartments: []});
                    setShowResults(true);
                })
                .catch(err => {
                    console.error("GlobalSearch query error:", err);
                    setResults({students: [], clubs: [], class_groups: [], apartments: []});
                })
                .finally(() => setIsSearching(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const renderResultItem = (icon: React.ReactNode, title: string, subtitle: string, url: string, color: "student" | "housing" | "orga") => {
        const borderColors = {
            student: "hover:border-student-500",
            housing: "hover:border-housing-500",
            orga: "hover:border-orga-500"
        };
        const iconContainerBorders = {
            student: "group-hover:border-student-500/50",
            housing: "group-hover:border-housing-500/50",
            orga: "group-hover:border-orga-500/50"
        };

        return (
            <div 
                key={url}
                className={`p-3 hover:bg-zinc-900 border-l-2 border-transparent ${borderColors[color]} cursor-pointer transition-all flex items-center gap-4 group`}
                onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    router.push(url);
                    setSearch("");
                    setShowResults(false);
                }}
            >
                <div className={`w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center ${iconContainerBorders[color]} transition-colors`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-white uppercase tracking-wider truncate group-hover:text-white">{title}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase truncate">{subtitle}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-white transition-all group-hover:translate-x-1" />
            </div>
        );
    };

    const dropdown = showResults && (search.length >= 2) && (
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {isSearching && (
                <div className="p-4 flex items-center justify-center gap-3 text-zinc-500 font-mono text-[10px] uppercase tracking-widest italic">
                    <Loader2 className="w-3 h-3 animate-spin" /> Querying Database...
                </div>
            )}
            
            {!isSearching && results.students.length === 0 && results.clubs.length === 0 && (!results.class_groups || results.class_groups.length === 0) && results.apartments.length === 0 && (
                <div className="p-6 text-[10px] text-zinc-600 font-mono text-center uppercase tracking-[0.2em] italic">
                    No matches found for &quot;{search}&quot;
                </div>
            )}

            {results.students.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-zinc-900/50 border-y border-zinc-800/50 text-[9px] font-black text-zinc-500 font-mono uppercase tracking-[0.2em]">Students</div>
                    {results.students.map(s => renderResultItem(
                        <User className="w-4 h-4 text-student-500" />,
                        `${s.first_name} ${s.last_name}`,
                        `ID: ${s.trombint_id} ${s.apartment ? `// APT: ${s.apartment}` : ''}`,
                        `${prefix}/students/${s.id}`,
                        'student'
                    ))}
                </div>
            )}

            {results.apartments.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-zinc-900/50 border-y border-zinc-800/50 text-[9px] font-black text-zinc-500 font-mono uppercase tracking-[0.2em]">Apartments</div>
                    {results.apartments.map(a => renderResultItem(
                        <Home className="w-4 h-4 text-housing-500" />,
                        `Apartment ${a.apartment_id}`,
                        `Resident: ${a.student_name}`,
                        `${prefix}/apartments?room=${a.apartment_id}`,
                        'housing'
                    ))}
                </div>
            )}

            {results.clubs.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-zinc-900/50 border-y border-zinc-800/50 text-[9px] font-black text-zinc-500 font-mono uppercase tracking-[0.2em]">Associations</div>
                    {results.clubs.map(c => renderResultItem(
                        <Users className="w-4 h-4 text-orga-500" />,
                        c.name,
                        `Slug: ${c.slug}`,
                        `${prefix}/clubs/${c.id}`,
                        'orga'
                    ))}
                </div>
            )}

            {results.class_groups && results.class_groups.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-zinc-900/50 border-y border-zinc-800/50 text-[9px] font-black text-zinc-500 font-mono uppercase tracking-[0.2em]">Academic Classes</div>
                    {results.class_groups.map(cg => renderResultItem(
                        <GraduationCap className="w-4 h-4 text-student-500" />,
                        cg.name,
                        `Academic cohort`,
                        `${prefix}/class-groups/${cg.id}`,
                        'student'
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <SearchBar
            id="global-search-input"
            placeholder="SEARCH DATABASE..."
            value={search}
            onChange={setSearch}
            results={dropdown}
            className={`h-10 ${className}`}
            inputClassName={`h-10 ${inputClassName}`}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            icon={<Search className="h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-student-500" />}
            accentColorClass="group-focus-within:bg-student-500"
        />
    );
}
