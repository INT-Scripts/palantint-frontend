"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Lock, User, LogIn, Loader2Icon } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        document.title = "Login | PalantINT";
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
                router.push("/account");
            }
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Generative Noise Texture / Granular Ambient Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }}></div>

            {/* Deep Atmospheric Light Orbs (Color-Dodge & Screen) */}
            <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-blue-600/15 blur-[140px] rounded-full mix-blend-screen mix-blend-color-dodge z-0 pointer-events-none animate-pulse duration-10000" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/15 blur-[120px] rounded-full mix-blend-screen mix-blend-color-dodge z-0 pointer-events-none animate-pulse duration-7000" />

            {/* Brutalist Glassmorphism Container */}
            <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/60 rounded-none p-10 lg:p-12 backdrop-blur-xl shadow-2xl relative z-10 
                            before:absolute before:pointer-events-none before:inset-0 before:border-l-4 before:border-blue-500/80 before:opacity-0 before:transition-opacity hover:before:opacity-100 group/login">
                
                {/* Decorative Crosshair / Editorial Detail */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-zinc-700 pointer-events-none opacity-50"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-zinc-700 pointer-events-none opacity-50"></div>

                <div className="text-left mb-10 space-y-2">
                    <h1 className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 tracking-tighter uppercase leading-none drop-shadow-lg">
                        Palant<span className="text-blue-500">INT</span>
                    </h1>
                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.2em] border-l-2 border-zinc-700 pl-3">
                        Sign In
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-950/30 border-l border-red-500 text-red-400 text-xs font-mono uppercase tracking-widest flex items-start gap-3 shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0 animate-pulse"></div>
                        <span>ERROR: {error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-8">
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center justify-between">
                            <span>Username</span>
                            <span className="text-zinc-800 font-mono">USER</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 w-1 bg-zinc-800 group-focus-within:bg-blue-500 transition-colors z-20" />
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-14 bg-zinc-950/50 backdrop-blur-2xl border-y border-r border-l-0 border-zinc-800/80 rounded-none pl-12 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-700 shadow-inner focus-visible:ring-0 focus-visible:border-blue-500/50 transition-all hover:bg-zinc-900/60 outline-none"
                                placeholder="USERNAME"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center justify-between">
                            <span>Password</span>
                            <span className="text-zinc-800 font-mono">PASS</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 w-1 bg-zinc-800 group-focus-within:bg-blue-500 transition-colors z-20" />
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-14 bg-zinc-950/50 backdrop-blur-2xl border-y border-r border-l-0 border-zinc-800/80 rounded-none pl-12 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-700 shadow-inner focus-visible:ring-0 focus-visible:border-blue-500/50 transition-all hover:bg-zinc-900/60 outline-none"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 flex items-center justify-between px-6 bg-zinc-100 hover:bg-white text-zinc-950 font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            <span>{loading ? "Authenticating..." : "Login"}</span>
                            <span>
                                {loading ? <Loader2Icon /> : <LogIn />}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Decorative Grid Floor */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none mask-image-bottom [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
        </div>
    );
}
