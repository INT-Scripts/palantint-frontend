"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Menu, User, Eye, LogIn, Compass, Home as HomeIcon, Settings, LogOut, Search } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<{ username: string, is_admin: boolean } | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
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


    if (authLoading) return <div className="fixed top-0 left-0 w-full h-[72px] sm:h-[80px] bg-transparent z-[100]"></div>;

    return (
        <>
            <nav className="fixed top-0 left-0 z-[100] w-full bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-900 shadow-2xl px-4 sm:px-6 py-3 sm:py-4">
            <div className="mx-auto w-full flex items-center justify-between gap-2 sm:gap-4"> 
                <div className="flex items-center gap-4 sm:gap-12">
                    <div
                        className="text-xl sm:text-2xl font-black tracking-tighter cursor-pointer hover:opacity-80 transition flex items-center gap-3 sm:gap-4 text-white group uppercase leading-none"
                        onClick={() => router.push("/")}
                    >
                        <div className="relative w-10 h-10 border border-zinc-800 flex items-center justify-center overflow-hidden">
                            <img src="/palantint.svg" alt="PalantINT Logo" className="w-6 h-6 relative z-10 invert brightness-0" />
                        </div>
                        <span className="bg-clip-text text-white">Palant<span className="text-zinc-500">INT</span></span>
                    </div>

                        <GlobalSearch className="hidden md:flex" inputClassName="w-85" />
                </div>

                <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                    <div className="hidden lg:flex items-center gap-6 text-sm font-mono tracking-widest text-zinc-500 uppercase">
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/")}>Students</span>
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/clubs")}>Organisations</span>
                        <span className="cursor-pointer hover:text-white transition-colors" onClick={() => router.push("/apartments")}>Housing</span>
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
                                className="flex items-center gap-2 sm:gap-4 bg-zinc-950 p-1 sm:p-2 sm:pr-6 border border-zinc-800 cursor-pointer hover:border-zinc-500 transition-all group rounded-none"
                                onClick={() => router.push(`/account`)}
                            >
                                <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 group-hover:bg-zinc-700 transition-colors">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold text-white uppercase tracking-wider leading-tight group-hover:text-white transition-colors">{user.username}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
                                        {user.is_admin ? 'SYS_ADMIN' : 'OPERATIVE'}
                                    </p>
                                </div>
                                <User className="hidden sm:block w-4 h-4 text-zinc-600 group-hover:text-zinc-100 transition-colors ml-2 sm:ml-4 shrink-0" />
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
                            className="bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold uppercase tracking-widest h-10 sm:h-12 px-4 sm:px-8 text-xs sm:text-sm rounded-none shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all shrink-0 border-none"
                        >
                            Authenticate
                        </Button>
                    )}
                </div>
            </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
            <div className="fixed inset-0 top-[73px] z-40 bg-zinc-950/95 backdrop-blur-3xl border-t border-zinc-900 lg:hidden flex flex-col p-6">
                <div className="flex flex-col gap-6 text-lg font-mono tracking-widest text-zinc-400 uppercase">
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/"); }}
                    >
                        <span>Students</span>
                        <Search className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/clubs"); }}
                    >
                        <span>Organisations</span>
                        <Compass className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/apartments"); }}
                    >
                        <span>Housing</span>
                        <HomeIcon className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                </div>
                
                <div className="mt-auto pb-8">
                     {user ? (
                         <div className="flex items-center gap-4 bg-zinc-900 p-4 border border-zinc-800 rounded-none">
                             <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center text-lg font-mono font-bold text-white rounded-none">
                                 {user.username.charAt(0).toUpperCase()}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <p className="text-base font-bold text-white uppercase tracking-wider truncate">{user.username}</p>
                                 <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{user.is_admin ? "SYS_ADMIN" : "OPERATIVE"}</p>
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
                             className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold uppercase tracking-widest h-14 rounded-none border-none"
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
