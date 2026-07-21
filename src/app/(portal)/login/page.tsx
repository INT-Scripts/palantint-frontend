"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Lock, User, LogIn, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        document.title = "Campus Login";
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // OAuth2 requires form data
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);

            const res = await fetchAPI("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
            });

            if (res.access_token) {
                localStorage.setItem("palantint_token", res.access_token);
                if (res.refresh_token) {
                    localStorage.setItem("palantint_refresh_token", res.refresh_token);
                    document.cookie = `palantint_refresh_token=${res.refresh_token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
                }
                document.cookie = `palantint_token=${res.access_token}; path=/; max-age=${5 * 60}; SameSite=Lax`;
                router.push("/palantint/account");
            }
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 via-stone-50 to-amber-50/15 p-4 relative overflow-hidden font-sans">
            {/* Fine Geometric Dot Pattern (Bauhaus Grid Accent) */}
            <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>

            {/* Dynamic Soft Warm Ambient Glows (Behind Card) */}
            <div className="absolute top-[10%] left-[10%] w-[35vw] h-[35vw] bg-amber-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] bg-blue-500/5 blur-[150px] rounded-full z-0 pointer-events-none" />

            {/* Swiss-Bauhaus Glassmorphism Card */}
            <div className="w-full max-w-md bg-white/70 border border-zinc-200/80 rounded-2xl p-10 lg:p-12 backdrop-blur-xl shadow-2xl relative z-10 
                            transition-all duration-500 hover:shadow-[0_30px_60px_rgba(24,24,27,0.06)] group/login">
                
                {/* Return button */}
                <button 
                    onClick={() => router.push("/")}
                    className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors group/back"
                >
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-0.5 transition-transform" />
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.2em]">Return to Gateway</span>
                </button>

                <div className="text-left mb-8 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-950 flex items-center justify-center text-xs font-bold text-white">I</div>
                        <h1 className="text-3xl font-black text-zinc-950 tracking-tight uppercase leading-none">
                            INT <span className="text-zinc-500 font-bold">PORTAL</span>
                        </h1>
                    </div>
                    <p className="text-zinc-400 font-mono text-[9px] uppercase tracking-[0.25em] border-l border-zinc-300 pl-3">
                        Campus Authentication Gate
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-mono uppercase tracking-wider flex items-start gap-3 shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0 animate-pulse"></div>
                        <span>ERROR: {error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2 group">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center justify-between">
                            <span>Username</span>
                            <span className="text-zinc-300 font-mono">USER</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/login:text-zinc-900 transition-colors pointer-events-none z-10" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-14 bg-white/50 border border-zinc-200 rounded-xl pl-11 pr-4 text-sm font-mono text-zinc-900 placeholder-zinc-300 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5 transition-all outline-none"
                                placeholder="USERNAME"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center justify-between">
                            <span>Password</span>
                            <span className="text-zinc-300 font-mono">PASS</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/login:text-zinc-900 transition-colors pointer-events-none z-10" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-14 bg-white/50 border border-zinc-200 rounded-xl pl-11 pr-4 text-sm font-mono text-zinc-900 placeholder-zinc-300 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5 transition-all outline-none"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 flex items-center justify-between px-6 bg-zinc-950 hover:bg-zinc-900 text-white font-bold uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <span>{loading ? "Syncing..." : "Sign In"}</span>
                            <span>
                                <LogIn className="w-4 h-4" />
                            </span>
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Fine architectural footer details */}
            <div className="absolute bottom-6 left-6 font-mono text-[8px] text-zinc-400 uppercase tracking-widest">
                SYS: V21.0 // EVR_NODE_06
            </div>
        </div>
    );
}
