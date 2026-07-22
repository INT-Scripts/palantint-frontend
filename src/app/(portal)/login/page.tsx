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
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background text-foreground p-4 relative font-sans transition-colors duration-200">
            {/* Background grid accent */}
            <div 
                className="absolute inset-0 z-0 opacity-25 dark:opacity-10 pointer-events-none" 
                style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />

            {/* Lean Auth Card */}
            <div className="w-full max-w-sm sm:max-w-md bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg relative z-10">
                
                {/* Return Link */}
                <button 
                    type="button"
                    onClick={() => router.push("/")}
                    className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    <span>Return to Gateway</span>
                </button>

                {/* Title Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold tracking-tight uppercase">
                        INT <span className="text-amber-500 font-extrabold">Portal</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                        Sign in with your campus account
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-mono">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5 group">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <span>Username</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full h-10 bg-muted/40 border border-input rounded-lg pl-10 pr-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                placeholder="Username"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 group">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <span>Password</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-10 bg-muted/40 border border-input rounded-lg pl-10 pr-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:bg-background focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wider text-xs rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>{loading ? "Signing in..." : "Sign In"}</span>
                            <LogIn className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
