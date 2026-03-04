"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        fetchAPI("/users/me")
            .then((user) => {
                if (user.is_admin) {
                    setIsAdmin(true);
                } else {
                    router.push("/");
                }
            })
            .catch(() => {
                router.push("/login");
            });
    }, [router]);

    if (isAdmin === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-2 text-red-400 text-sm font-semibold tracking-wide">
                <ShieldAlert className="w-4 h-4" /> Admin Console
            </div>
            <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {children}
            </div>
        </div>
    );
}
