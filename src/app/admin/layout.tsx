"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { ShieldAlert, Cpu } from "lucide-react";

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
        return <div className="min-h-screen bg-zinc-950" />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col relative text-zinc-100 font-sans selection:bg-comms-500/30">
            {/* Atmospheric Lighting (Orbes Bioluminescentes) */}
            <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-comms-900/10 blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-housing-900/5 blur-[150px] pointer-events-none mix-blend-screen" />
            
            {/* Noise Texture */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="relative z-10 bg-comms-950/20 border-b border-comms-900/30 px-6 py-3 flex items-center justify-between backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-comms-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-comms-400 text-xs font-mono uppercase tracking-[0.2em] font-bold">Administrative Access</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                    <Cpu className="w-4 h-4" />
                    <span className="font-mono text-[10px] tracking-widest">SYSTEM ACTIVE</span>
                </div>
            </div>
            
            <div className="flex-1 p-6 md:p-12 md:pt-16 max-w-[1600px] mx-auto w-full relative z-10">
                {children}
            </div>
        </div>
    );
}
