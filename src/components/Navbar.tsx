"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Search, Menu, User, Eye, LogIn, Compass, Home as HomeIcon, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<{ username: string, is_admin: boolean } | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetchAPI("/users/me")
            .then((data) => setUser(data))
            .catch(() => {})
            .finally(() => setAuthLoading(false));
            
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (search.length > 1) {
            fetchAPI(`/students?q=${search}`)
                .then(res => {
                    setResults(res.slice(0, 5));
                    setShowResults(true);
                })
                .catch(() => setResults([]));
        } else {
            setShowResults(false);
        }
    }, [search]);

    if (authLoading) return <div className="h-20 w-full bg-transparent"></div>;

    return (
        <>
            <nav className="sticky top-0 z-[100] w-full bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-900 shadow-2xl px-4 sm:px-6 py-3 sm:py-4">
            <div className="mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">
                    
                    <div className="flex items-center gap-4 sm:gap-12">
                        <div
                            className="text-xl sm:text-2xl font-black tracking-tighter cursor-pointer hover:opacity-80 transition flex items-center gap-3 sm:gap-4 text-white group uppercase leading-none"
                            onClick={() => router.push("/")}
                        >
                            <div className="relative w-10 h-10 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-blue-500/20 mix-blend-screen group-hover:bg-blue-500/40 transition-colors" />
                                <img src="/palantint.svg" alt="PalantINT Logo" className="w-6 h-6 relative z-10 invert brightness-0" />
                        </div>
                        <span className="bg-clip-text text-white">Palant<span className="text-zinc-500">INT</span></span>
                    </div>

                    <div className="hidden md:flex relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 z-10 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            type="text"
                            placeholder="SEARCH..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => { if (search.length > 1) setShowResults(true) }}
                            onBlur={() => setTimeout(() => setShowResults(false), 200)}
                            className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800 rounded-none h-12 pl-12 pr-4 text-sm text-zinc-300 font-mono w-72 focus:w-96 shadow-inner focus-visible:ring-0 focus-visible:border-blue-500/50 transition-all duration-500 hover:bg-zinc-900/80"
                        />

                        {showResults && results.length > 0 && (
                            <div className="absolute top-16 left-0 w-full bg-zinc-950 backdrop-blur-3xl border border-zinc-800 shadow-2xl z-50 py-2">
                                {results.map(student => (
                                    <div
                                        key={student.id}
                                        className="px-4 py-3 hover:bg-zinc-900 border-l-2 border-transparent hover:border-blue-500 cursor-pointer flex items-center gap-4 transition-all"
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            router.push(`/students/${student.id}`);
                                            setSearch("");
                                            setShowResults(false);
                                        }}
                                    >
                                        <div className="h-10 w-10 border border-zinc-800 overflow-hidden">
                                            <img src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image`} alt={student.first_name} className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-white font-bold uppercase tracking-wide">{student.first_name} {student.last_name}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{student.promo || "UNKNOWN"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                    <div className="hidden lg:flex items-center gap-6 text-sm font-mono tracking-widest text-zinc-500 uppercase">
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/")}>Students</span>
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/clubs")}>Clubs</span>
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/apartments")}>Apartments</span>
                    </div>

                    <div className="lg:hidden">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none h-10 w-10 border border-zinc-800"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-2">
                            <div
                                className="flex items-center gap-2 sm:gap-4 bg-zinc-950 p-1 sm:p-2 sm:pr-6 border border-zinc-800 cursor-pointer hover:border-blue-500/50 transition-all group"
                                onClick={() => router.push(`/account`)}
                            >
                                <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 group-hover:bg-blue-900/40 transition-colors">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-sm font-bold text-white uppercase tracking-wider leading-tight group-hover:text-blue-400 transition-colors">{user.username}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest group-hover:text-blue-500/70 transition-colors">
                                        {user.is_admin ? 'ADMIN' : 'USER'}
                                    </p>
                                </div>
                                <User className="hidden sm:block w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-colors ml-2 sm:ml-4 shrink-0" />
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hidden sm:flex text-zinc-500 hover:text-red-500 hover:bg-red-500/10 bg-zinc-950 border border-zinc-800 rounded-none h-[42px] w-[42px] sm:h-[50px] sm:w-[50px] transition-all shrink-0 cursor-pointer hover:border-red-500/50"
                                onClick={() => {
                                    localStorage.removeItem("palantint_token");
                                    window.location.reload();
                                }}
                                title="Log Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={() => router.push('/login')}
                            className="bg-white hover:bg-zinc-200 text-black font-mono font-bold uppercase tracking-widest h-10 sm:h-12 px-4 sm:px-8 text-xs sm:text-sm rounded-none shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all shrink-0"
                        >
                            Authenticate
                        </Button>
                    )}
                </div>
            </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 top-[73px] z-40 bg-zinc-950/95 backdrop-blur-3xl border-t border-zinc-900 lg:hidden flex flex-col p-6 animate-in slide-in-from-top-2">
                <div className="flex flex-col gap-6 text-lg font-mono tracking-widest text-zinc-400 uppercase">
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/"); }}
                    >
                        <span>Agents</span>
                        <Search className="w-5 h-5 text-zinc-600 group-hover:text-blue-500" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-emerald-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/clubs"); }}
                    >
                        <span>Entities</span>
                        <Compass className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-orange-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/apartments"); }}
                    >
                        <span>Facilities</span>
                        <HomeIcon className="w-5 h-5 text-zinc-600 group-hover:text-orange-500" />
                    </button>
                </div>
                
                <div className="mt-auto pb-8">
                     {user ? (
                         <div className="flex items-center gap-4 bg-zinc-900 p-4 border border-zinc-800">
                             <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center text-lg font-mono font-bold text-white">
                                 {user.username.charAt(0).toUpperCase()}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <p className="text-base font-bold text-white uppercase tracking-wider truncate">{user.username}</p>
                                 <p className="text-xs text-blue-500 font-mono uppercase tracking-widest">{user.is_admin ? "SYS_ADMIN" : "OPERATIVE"}</p>
                             </div>
                             <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-500" onClick={() => {
                                 localStorage.removeItem("palantint_token");
                                 window.location.reload();
                             }}>
                                 <LogOut className="w-5 h-5" />
                             </Button>
                         </div>
                     ) : (
                         <Button
                             onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
                             className="w-full bg-white hover:bg-zinc-200 text-black font-mono font-bold uppercase tracking-widest h-14 rounded-none"
                         >
                             <LogIn className="w-5 h-5 mr-3" />
                             Authenticate
                         </Button>
                     )}
                </div>
            </div>
        )}
        </>
    );
}
