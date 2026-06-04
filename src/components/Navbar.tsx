"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Menu, User, Eye, LogIn, Compass, Home as HomeIcon, Settings, LogOut, Search, MapPin, Share2, CalendarDays, Flame, WashingMachine, ChevronDown } from "lucide-react";
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
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            fetchAPI("/users/me")
                .then((data) => setUser(data))
                .catch(() => {})
                .finally(() => setAuthLoading(false));
        } else {
            setAuthLoading(false);
        }
            
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
                            <img src="/palantint.svg" alt={user ? "PalantINT Logo" : "INT Logo"} className="w-6 h-6 relative z-10 invert brightness-0" />
                        </div>
                        {user ? (
                            <span className="bg-clip-text text-white">Palant<span className="text-zinc-500">INT</span></span>
                        ) : (
                            <span className="bg-clip-text text-white">INT<span className="text-zinc-500"> PORTAL</span></span>
                        )}
                    </div>

                        <GlobalSearch className="hidden md:flex" inputClassName="w-85" />
                </div>

                <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                    <div className="hidden lg:flex items-center gap-6 text-sm font-mono tracking-widest text-zinc-500 uppercase">
                        {/* Campus Life Dropdown */}
                        <div className="relative group py-2">
                            <button className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors duration-200 uppercase tracking-widest text-xs font-mono text-zinc-400 focus:outline-none border-none bg-transparent">
                                <span>Campus</span>
                                <ChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:rotate-180 text-zinc-600 group-hover:text-white" />
                            </button>
                            <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl p-2 rounded-none opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50 flex flex-col gap-1">
                                <span 
                                    className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                    onClick={() => router.push("/clubs")}
                                >
                                    <Compass className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Associations</p>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Student clubs & organisations</p>
                                    </div>
                                </span>
                                <span 
                                    className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                    onClick={() => router.push("/campus")}
                                >
                                    <MapPin className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Campus 3D</p>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Interactive 3D navigation</p>
                                    </div>
                                </span>
                                <span 
                                    className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                    onClick={() => router.push("/apartments")}
                                >
                                    <HomeIcon className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Apartments</p>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">On-campus housing registry</p>
                                    </div>
                                </span>
                            </div>
                        </div>

                        {/* Directory Dropdown (Only if logged in) */}
                        {user && (
                            <div className="relative group py-2">
                                <button className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors duration-200 uppercase tracking-widest text-xs font-mono text-zinc-400 focus:outline-none border-none bg-transparent">
                                    <span>Directory</span>
                                    <ChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:rotate-180 text-zinc-600 group-hover:text-white" />
                                </button>
                                <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl p-2 rounded-none opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50 flex flex-col gap-1">
                                    <span 
                                        className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                        onClick={() => router.push("/students")}
                                    >
                                        <User className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Students</p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Student registry & profiles</p>
                                        </div>
                                    </span>
                                    <span 
                                        className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                        onClick={() => router.push("/network")}
                                    >
                                        <Share2 className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Network</p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Student connection graph</p>
                                        </div>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Services Dropdown */}
                        <div className="relative group py-2">
                            <button className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors duration-200 uppercase tracking-widest text-sm font-mono text-zinc-500 focus:outline-none border-none bg-transparent">
                                <span>Services</span>
                                <ChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:rotate-180 text-zinc-600 group-hover:text-white" />
                            </button>
                            <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl p-2 rounded-none opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50 flex flex-col gap-1">
                                <span 
                                    className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                    onClick={() => router.push("/laundry")}
                                >
                                    <WashingMachine className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Laundry</p>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Washing machine availability</p>
                                    </div>
                                </span>
                                {user && (
                                    <>
                                        <span 
                                            className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                            onClick={() => router.push("/timetable")}
                                        >
                                            <CalendarDays className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">Timetable</p>
                                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Academic calendar & classes</p>
                                            </div>
                                        </span>
                                        <span 
                                            className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-all duration-200 cursor-pointer group/item text-left normal-case"
                                            onClick={() => router.push("/pay5vend")}
                                        >
                                            <Flame className="w-4 h-4 text-zinc-500 group-hover/item:text-white transition-colors shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors uppercase tracking-wider">PAY5VEND</p>
                                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 tracking-normal">Vending machine service</p>
                                            </div>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
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
                                className="hidden sm:flex text-zinc-500 hover:text-comms-500 hover:bg-comms-500/10 bg-zinc-950 border border-zinc-800 rounded-none h-[42px] w-[42px] sm:h-[50px] sm:w-[50px] transition-all shrink-0 cursor-pointer hover:border-comms-500/50"
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
                    {user && (
                        <button 
                            className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                            onClick={() => { setMobileMenuOpen(false); router.push("/students"); }}
                        >
                            <span>Students</span>
                            <Search className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                        </button>
                    )}
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/clubs"); }}
                    >
                        <span>Associations</span>
                        <Compass className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/apartments"); }}
                    >
                        <span>Apartments</span>
                        <HomeIcon className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/laundry"); }}
                    >
                        <span>Laundry</span>
                        <WashingMachine className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                    </button>
                    {user && (
                        <button 
                            className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                            onClick={() => { setMobileMenuOpen(false); router.push("/timetable"); }}
                        >
                            <span>Timetable</span>
                            <CalendarDays className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                        </button>
                    )}
                    {user && (
                        <button 
                            className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                            onClick={() => { setMobileMenuOpen(false); router.push("/network"); }}
                        >
                            <span>Network</span>
                            <Share2 className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                        </button>
                    )}
                    {user && (
                        <button 
                            className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                            onClick={() => { setMobileMenuOpen(false); router.push("/pay5vend"); }}
                        >
                            <span>PAY5VEND</span>
                            <Flame className="w-5 h-5 text-zinc-600 group-hover:text-white" />
                        </button>
                    )}
                    <button 
                        className="text-left py-4 border-b border-zinc-800 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-between group"
                        onClick={() => { setMobileMenuOpen(false); router.push("/campus"); }}
                    >
                        <span>Campus 3D</span>
                        <MapPin className="w-5 h-5 text-zinc-600 group-hover:text-white" />
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
                             <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-comms-500" onClick={() => {
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
