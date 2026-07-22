"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Lock, User, LogIn, ArrowLeft, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        document.title = "Campus Login | INT Portal";
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
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
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-stone-50 p-4 relative overflow-hidden font-sans">
            {/* Fine Geometric Dot Pattern (Bauhaus Grid Accent) */}
            <div 
                className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
                style={{ backgroundImage: "radial-gradient(#d6d3d1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />

            {/* Dynamic Soft Warm Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/10 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-stone-300/20 blur-[150px] rounded-full z-0 pointer-events-none" />

            {/* Swiss-Bauhaus Glassmorphism Card */}
            <div className="w-full max-w-md bg-white/80 border border-stone-200/90 rounded-2xl p-8 sm:p-10 backdrop-blur-xl shadow-xl shadow-stone-900/5 relative z-10 transition-all duration-300">
                
                {/* Return button */}
                <button 
                    type="button"
                    onClick={() => router.push("/")}
                    className="mb-6 inline-flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                    <span className="text-[11px] font-semibold font-mono uppercase tracking-wider">Return to Gateway</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center font-bold text-sm shadow-sm relative">
                            INT
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight uppercase leading-none">
                                INT <span className="text-amber-600 font-bold">PORTAL</span>
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 border-l-2 border-amber-500/40 pl-3 mt-3">
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                        <p className="text-stone-500 font-mono text-[10px] uppercase tracking-widest">
                            Campus Authentication Gate
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-xl text-xs font-mono uppercase tracking-wide flex items-center gap-2.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                        <span>ERROR: {error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Username Input */}
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center justify-between">
                            <span>Username</span>
                            <span className="text-stone-400 font-mono text-[9px]">CAS SSO</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-stone-900 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-12 bg-stone-50/80 border border-stone-200/90 rounded-xl pl-11 pr-4 text-sm font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                                placeholder="e.g. john.doe"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center justify-between">
                            <span>Password</span>
                            <span className="text-stone-400 font-mono text-[9px]">ENCRYPTED</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-stone-900 transition-colors pointer-events-none" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-12 bg-stone-50/80 border border-stone-200/90 rounded-xl pl-11 pr-4 text-sm font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 flex items-center justify-between px-6 bg-stone-900 hover:bg-stone-800 text-stone-50 font-bold uppercase tracking-widest text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]"
                        >
                            <span>{loading ? "Authenticating..." : "Sign In"}</span>
                            <LogIn className="w-4 h-4 text-amber-400" />
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Architectural Footer Detail */}
            <div className="absolute bottom-4 left-6 font-mono text-[9px] text-stone-400 uppercase tracking-widest pointer-events-none">
                SYS: V21.0 // CAS_AUTH_GATE
            </div>
        </div>
    );
}
