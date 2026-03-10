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

    // Force scroll to top on route change OR when auth state changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.scrollTo(0, 0);
        }
    }, [pathname, isAuthenticated]);

    // Don't render anything until we've checked auth to prevent flashing
    if (isAuthenticated === null && pathname !== "/login") {
        return <div className="min-h-screen bg-zinc-950" />;
    }

    const isLoginPage = pathname === "/login";

    return (
        <>
            {!isLoginPage && <Navbar />}
            <div className={!isLoginPage ? "pt-[72px] sm:pt-[80px]" : ""}>
                {children}
            </div>
        </>
    );
}
