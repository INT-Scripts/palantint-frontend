"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem("palantint_token");
            
            if (!token && pathname !== "/login") {
                router.replace("/login");
            } else {
                setIsAuthenticated(true);
            }
        };

        checkAuth();
    }, [pathname, router]);

    // Don't render anything until we've checked auth to prevent flashing
    if (isAuthenticated === null && pathname !== "/login") {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[30%] right-[20%] w-[30%] h-[30%] bg-emerald-600/10 blur-[100px] rounded-full mix-blend-screen animate-pulse delay-700" />
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-t-2 border-r-2 border-zinc-800 rounded-full animate-spin duration-1000" />
                        <div className="absolute inset-2 border-b-2 border-l-2 border-zinc-600 rounded-full animate-spin duration-700 reverse" />
                        <div className="absolute inset-4 border-t-2 border-blue-500 rounded-full animate-spin duration-500" />
                    </div>
                    <div className="text-zinc-500 font-mono text-xs tracking-[0.3em] uppercase animate-pulse">
                        Authenticating Stream...
                    </div>
                </div>
            </div>
        );
    }

    const isLoginPage = pathname === "/login";

    return (
        <>
            {!isLoginPage && <Navbar />}
            {children}
        </>
    );
}
