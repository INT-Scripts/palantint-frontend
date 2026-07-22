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
        document.title = "Login | INT Portal";
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
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 sm:p-8 font-sans">
            {/* Clean Readable Auth Card */}
            <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-8 sm:p-10 shadow-sm">
                
                {/* Return Link */}
                <button 
                    type="button"
                    onClick={() => router.push("/")}
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Return to Gateway</span>
                </button>

                {/* Title Header (Monochrome, crisp typography) */}
                <div className="mb-8 space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-foreground">
                        INT PORTAL
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                        Sign in with your campus account
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-mono">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2 group">
                        <label className="text-sm font-semibold text-foreground tracking-wide block">
                            Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-13 sm:h-14 bg-stone-50/80 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl pl-12 pr-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:bg-white dark:focus:bg-stone-950 focus:border-stone-900 dark:focus:border-stone-100 focus:ring-2 focus:ring-ring outline-none transition-all"
                                placeholder="Username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-sm font-semibold text-foreground tracking-wide block">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-13 sm:h-14 bg-stone-50/80 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-xl pl-12 pr-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:bg-white dark:focus:bg-stone-950 focus:border-stone-900 dark:focus:border-stone-100 focus:ring-2 focus:ring-ring outline-none transition-all"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-13 sm:h-14 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-stone-50 dark:text-stone-950 font-bold uppercase tracking-wider text-sm sm:text-base rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <span>{loading ? "Signing in..." : "Sign In"}</span>
                            <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
