"use client";

import { useEffect, useState } from "react";
import { fetchPrivate } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowRight, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TelemetryData {
  status: string;
  counts: {
    students: number;
    clubs: number;
    events: number;
    users: number;
  };
}

export default function Homepage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; is_admin: boolean } | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  
  // High-fidelity futuristic boot diagnostics state
  const [isBooting, setIsBooting] = useState<boolean>(true);
  const [bootLines, setBootLines] = useState<string[]>([]);

  useEffect(() => {
    Promise.resolve().then(() => {
      document.title = "PalantINT";
    });

    fetchPrivate("/users/me")
      .then(res => setUser(res))
      .catch(() => {});

    fetchPrivate("/admin/telemetry")
      .then(res => setTelemetry(res))
      .catch(() => {});

    // Operational diagnostics check trigger (runs every time the portal reloads/mounts)
    const lines = [
      "[BOOT] INITIALIZING INT LIBRARIES...",
      "[INIT] CAS-CONNECTOR  .............. [ SUCCESS ]",
      "[INIT] TROMBINT       .............. [ AUTHORIZED ]",
      "[INIT] SI-AGENDA      .............. [ AUTHORIZED ]",
      "[INIT] LAVER-INT      .............. [ SUCCESS ]",
      "[BOOT] GATEWAY READY. SECURING TUNNEL..."
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < lines.length) {
        const nextLine = lines[currentLine];
        if (nextLine !== undefined) {
          setBootLines(prev => [...prev, nextLine]);
        }
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsBooting(false);
        }, 400);
      }
    }, 180);

    return () => clearInterval(interval);
  }, []);

  // 1. FULLSCREEN SIMULATED BOOT DIAGNOSTICS GATEWAY
  if (isBooting) {
    return (
      <div className="fixed inset-0 bg-zinc-950 text-white z-[9999] flex flex-col items-center justify-center font-mono px-4 select-none">
        {/* Background Grid with Plus Signs */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="boot-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <line x1="0" y1="30" x2="60" y2="30" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 4" />
                <line x1="30" y1="0" x2="30" y2="60" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 4" />
                <path d="M26,30 L34,30 M30,26 L30,34" stroke="#3f3f46" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#boot-grid)" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-8 rounded-none shadow-[0_0_50px_rgba(24,24,27,0.8)] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">System Boot Diagnostic</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" />
          </div>
          <div className="space-y-2 text-xs text-zinc-400">
            {bootLines.map((line, idx) => {
              if (!line) return null;
              const isGreen = line.includes("SUCCESS") || line.includes("AUTHORIZED") || line.includes("READY");
              const isAmber = line.includes("RESTRICTED");
              return (
                <div 
                  key={idx} 
                  className={isGreen ? "text-emerald-400" : isAmber ? "text-amber-500" : "text-zinc-300"}
                >
                  {line}
                </div>
              );
            })}
          </div>
          <div className="pt-2 text-[9px] text-zinc-600 flex justify-between uppercase">
            <span>Core: v21.0.67</span>
            <span>Evry Node #67</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED SECRET PALANTINT MODE
  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden font-sans selection:bg-zinc-800">
      
      {/* Repeating background grid with plus signs */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06] bg-zinc-950">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bg-grid-auth" width="80" height="80" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2="80" y2="40" stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="1 7" />
              <line x1="40" y1="0" x2="40" y2="80" stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="1 7" />
              <path d="M36,40 L44,40 M40,36 L40,44" stroke="#71717a" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-grid-auth)" />
        </svg>
      </div>

      {/* Atmospheric Ambient Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-blue-900/10 blur-[180px] rounded-none mix-blend-screen" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[60%] bg-emerald-900/10 blur-[180px] rounded-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[50%] bg-amber-900/10 blur-[180px] rounded-none mix-blend-screen" />
      </div>

      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 mt-4">
        
        {/* HERO SECTION */}
        <section className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto mb-20">
          <img 
            src="/palantint.svg" 
            alt="PalantINT Logo" 
            className="w-48 h-48 sm:w-56 sm:h-56 opacity-95 filter drop-shadow-[0_0_30px_rgba(224,147,20,0.2)] select-none pointer-events-none" 
          />

          <div className="space-y-6">
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter uppercase leading-none text-white select-none">
              PALANT<span className="text-zinc-500">INT</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 font-mono max-w-2xl mx-auto uppercase tracking-wide leading-relaxed">
              The high-fidelity campus intelligence and spatial data visualisation platform. central directory, interactive wireframes, and unified timetable records.
            </p>
            {user && (
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mt-2 animate-pulse">
                Welcome back, operator // {user.username}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={() => router.push("/palantint/students")}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold uppercase tracking-widest h-12 px-8 rounded-none transition-all shadow-[0_0_30px_rgba(255,255,255,0.05)] border-none"
            >
              Access Directory <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/palantint/clubs")}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-mono uppercase tracking-widest h-12 px-8 rounded-none transition-all"
            >
              Explore Public Directories
            </Button>
          </div>
        </section>

        {/* CORE MODULES SECTION */}
        <section className="space-y-12 mb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-zinc-500" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Platform Infrastructure
              </h2>
            </div>
            
            {telemetry && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                <div>Students: <span className="text-zinc-300 font-bold">{telemetry.counts.students}</span></div>
                <div>Clubs: <span className="text-zinc-300 font-bold">{telemetry.counts.clubs}</span></div>
                <div>Events: <span className="text-zinc-300 font-bold">{telemetry.counts.events}</span></div>
                <div>Operators: <span className="text-zinc-300 font-bold">{telemetry.counts.users}</span></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Student Directory Module (Blue/Violet Accents) */}
            <Card className="p-0 border-zinc-800 hover:border-blue-500/40 bg-zinc-900/20 backdrop-blur-xl transition-all cursor-pointer rounded-none group relative overflow-hidden"
              onClick={() => router.push("/palantint/students")}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-800 group-hover:bg-blue-500 transition-colors" />
              <div className="absolute -inset-px bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <CardContent className="p-8 space-y-6 relative z-10 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                      Module // 01
                    </span>
                    {/* Glowing circular radar sweep vector */}
                    <svg className="w-12 h-12 text-zinc-700 group-hover:text-blue-400 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <circle cx="50" cy="50" r="35" />
                      <circle cx="50" cy="50" r="20" strokeDasharray="3 3" />
                      <circle cx="50" cy="50" r="5" fill="currentColor" />
                      <line x1="50" y1="50" x2="80" y2="25" strokeWidth="1.5" className="origin-center animate-[spin_3s_linear_infinite]" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-blue-400 transition-colors">
                    Student Profiles
                  </h3>
                  <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight leading-relaxed">
                    Search and query student directories. Access structured individual records, links, division profiles, and recent views. Protected with strict operational authentication.
                  </p>
                </div>
                <div className="pt-6 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase border-t border-zinc-800/60 mt-8 group-hover:border-blue-500/20 transition-colors">
                  <span className="text-zinc-500">Security Gate Required</span>
                  <span className="text-blue-400 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    ACCESS DIRECTORY <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Accredited Organisations Module (Emerald Accents) */}
            <Card className="p-0 border-zinc-800 hover:border-emerald-500/40 bg-zinc-900/20 backdrop-blur-xl transition-all cursor-pointer rounded-none group relative overflow-hidden"
              onClick={() => router.push("/palantint/clubs")}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-800 group-hover:bg-emerald-500 transition-colors" />
              <div className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <CardContent className="p-8 space-y-6 relative z-10 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                      Module // 02
                    </span>
                    {/* Glowing active node cluster vector */}
                    <svg className="w-12 h-12 text-zinc-700 group-hover:text-emerald-400 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <line x1="20" y1="50" x2="50" y2="20" className="animate-pulse" />
                      <line x1="50" y1="20" x2="80" y2="50" />
                      <line x1="80" y1="50" x2="50" y2="80" />
                      <line x1="50" y1="80" x2="20" y2="50" />
                      <line x1="20" y1="50" x2="80" y2="50" strokeDasharray="2 2" />
                      <line x1="50" y1="20" x2="50" y2="80" strokeDasharray="2 2" />
                      <circle cx="20" cy="50" r="3" fill="currentColor" />
                      <circle cx="50" cy="20" r="3" fill="currentColor" />
                      <circle cx="80" cy="50" r="3" fill="currentColor" />
                      <circle cx="50" cy="80" r="3" fill="currentColor" />
                      <circle cx="50" cy="50" r="2" fill="currentColor" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                    Associations & Clubs
                  </h3>
                  <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight leading-relaxed">
                    A comprehensive registry of associations, clubs, and active operational teams. Unauthenticated public access permits exploring groups, descriptions, and upcoming timelines.
                  </p>
                </div>
                <div className="pt-6 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase border-t border-zinc-800/60 mt-8 group-hover:border-emerald-500/20 transition-colors">
                  <span className="text-emerald-400/80">Public Catalog</span>
                  <span className="text-emerald-400 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    EXPLORE CLUBS <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Housing & Occupancies Module (Amber Accents) */}
            <Card className="p-0 border-zinc-800 hover:border-amber-500/40 bg-zinc-900/20 backdrop-blur-xl transition-all cursor-pointer rounded-none group relative overflow-hidden"
              onClick={() => router.push("/palantint/apartments")}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-800 group-hover:bg-amber-500 transition-colors" />
              <div className="absolute -inset-px bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <CardContent className="p-8 space-y-6 relative z-10 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                      Module // 03
                    </span>
                    {/* Glowing isometric blueprint layout vector */}
                    <svg className="w-12 h-12 text-zinc-700 group-hover:text-amber-400 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M50,15 L85,35 L85,65 L50,85 L15,65 L15,35 Z" />
                      <path d="M50,15 L50,85" strokeDasharray="2 2" />
                      <path d="M15,35 L85,65" strokeDasharray="2 2" />
                      <path d="M15,65 L85,35" strokeDasharray="2 2" />
                      <circle cx="50" cy="35" r="2" fill="currentColor" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-amber-400 transition-colors">
                    Apartment Blueprints
                  </h3>
                  <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight leading-relaxed">
                    Spatial campus housing charts. Explore apartment layout specifications and unit numbers publicly. Occupant details are dynamically stripped for privacy control.
                  </p>
                </div>
                <div className="pt-6 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase border-t border-zinc-800/60 mt-8 group-hover:border-amber-500/20 transition-colors">
                  <span className="text-amber-400/80">PII Guarded</span>
                  <span className="text-amber-400 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    VIEW BLUEPRINTS <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Campus 3D Wireframe Module */}
            <Card className="p-0 border-zinc-800 hover:border-zinc-500 bg-zinc-900/20 backdrop-blur-xl transition-all cursor-pointer rounded-none group relative overflow-hidden"
              onClick={() => router.push("/palantint/campus")}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-800 group-hover:bg-zinc-400 transition-colors" />

              <CardContent className="p-8 space-y-6 relative z-10 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      Module // 04
                    </span>
                    {/* Rotating wireframe skeletal cube */}
                    <svg className="w-12 h-12 text-zinc-700 group-hover:text-zinc-400 transition-colors animate-[spin_15s_linear_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="25" y="25" width="40" height="40" />
                      <rect x="35" y="35" width="40" height="40" strokeDasharray="2 2" />
                      <line x1="25" y1="25" x2="35" y2="35" />
                      <line x1="65" y1="25" x2="75" y2="35" />
                      <line x1="25" y1="65" x2="35" y2="75" />
                      <line x1="65" y1="65" x2="75" y2="75" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wide group-hover:text-zinc-305 transition-colors">
                    Campus 3D Wireframe
                  </h3>
                  <p className="text-zinc-400 text-xs font-mono uppercase tracking-tight leading-relaxed">
                    Interactive physical mapping powered by WebGL. Visualise three-dimensional structural outlines and physical relationships across buildings.
                  </p>
                </div>
                <div className="pt-6 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase border-t border-zinc-800/60 mt-8 group-hover:border-zinc-400/20 transition-colors">
                  <span className="text-zinc-500">WebGL Acceleration</span>
                  <span className="text-zinc-300 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    LAUNCH 3D MAP <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>
    </div>
  );
}
