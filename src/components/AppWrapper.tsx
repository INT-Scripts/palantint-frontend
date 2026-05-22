"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "./Navbar";

const PUBLIC_ROUTES = [
    "/",
    "/login",
    "/clubs",
    "/apartments",
    "/campus"
];

const isPublicRoute = (path: string) => {
    return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + "/"));
};

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem("palantint_token");
            const isPublic = isPublicRoute(pathname);
            
            if (!token && !isPublic) {
                router.replace("/login");
            } else {
                setIsAuthenticated(!!token);
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

    // Don't render anything until we've checked auth to prevent flashing for private routes
    if (isAuthenticated === null && !isPublicRoute(pathname)) {
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
