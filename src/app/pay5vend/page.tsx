"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Download, Coffee, Sparkles, Radio, Terminal, Fingerprint, Flame, ShieldAlert, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

export default function Pay5vendPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [rssi, setRssi] = useState(-58);
  const [coffeeCounter, setCoffeeCounter] = useState(14892);
  const [fundsLiberated, setFundsLiberated] = useState(22338.0);

  // Generate changing signal strength and telemetry counters for added fidelity
  useEffect(() => {
    const rssiInterval = setInterval(() => {
      setRssi(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        const next = prev + change;
        return next > -40 ? -40 : next < -75 ? -75 : next;
      });
    }, 3000);

    const counterInterval = setInterval(() => {
      setCoffeeCounter(prev => prev + (Math.random() > 0.7 ? 1 : 0));
      setFundsLiberated(prev => prev + (Math.random() > 0.7 ? 1.5 : 0));
    }, 4500);

    return () => {
      clearInterval(rssiInterval);
      clearInterval(counterInterval);
    };
  }, []);

  const triggerMockCompilationAndDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setLogLines([]);

    const steps = [
      "[SYS] CONNECTING TO INT SECURE COMPLIANCE KERNEL...",
      "[AUTH] IDENTIFYING OPERATOR KEYPRINT... GRANTED.",
      "[APK-BUILDER] RETRIEVING PAY5VEND DECOMPILED TARGET V4.6.2...",
      "[PATCH] INJECTING NFC CORESPOOF PAYLOAD (INFINITE_CREDITS_V3.HEX)...",
      "[PATCH] OVERRIDING VALUE REGISTERS: €1.50 -> €0.00 IN ALL REGIONS...",
      "[COMPRESS] SHRINKING RESOURCES.ARSC...",
      "[SIGN] SECURING APK PACKAGES WITH SHADY CERTIFICATE AUTHORITY...",
      "[SYS] COMPILING EXPLOIT SOURCE FOR DEPLOYMENT...",
      "[SYS] EXPLOIT SOURCE READY. INITIATING WIRE TRANSFER..."
    ];

    let currentStep = 0;
    const logInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setLogLines(prev => [...prev, steps[currentStep] || ""]);
        currentStep++;
      } else {
        clearInterval(logInterval);
        
        // Progress bar simulation
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setTimeout(async () => {
                try {
                  const token = localStorage.getItem("palantint_token");
                  const headers: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};
                  const response = await fetch(`${API_BASE_URL}/pay5vend/download`, { headers });
                  if (!response.ok) {
                    throw new Error("Failed to download payload");
                  }
                  const blob = await response.blob();
                  const element = document.createElement("a");
                  element.href = URL.createObjectURL(blob);
                  element.download = "pay5vend.apk";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                } catch (err) {
                  console.error(err);
                  alert("Error downloading APK: Ensure you are logged in and the server APK is built.");
                } finally {
                  setDownloading(false);
                }
              }, 600);
              return 100;
            }
            return prev + Math.floor(Math.random() * 15) + 5;
          });
        }, 120);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden font-sans selection:bg-rose-950 selection:text-rose-100">
      
      {/* Repeating background grid with custom tactical plus signs */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06] bg-zinc-950">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bg-grid-pay5" width="80" height="80" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2="80" y2="40" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="1 7" />
              <line x1="40" y1="0" x2="40" y2="80" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="1 7" />
              <path d="M36,40 L44,40 M40,36 L40,44" stroke="#fb7185" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-grid-pay5)" />
        </svg>
      </div>

      {/* Atmospheric Ambient Glows - Sleek Red/Rose exploiting theme */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[50%] bg-rose-900/10 blur-[180px] rounded-none mix-blend-screen" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[60%] bg-amber-900/5 blur-[180px] rounded-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[50%] bg-zinc-900/15 blur-[180px] rounded-none mix-blend-screen" />
      </div>

      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        
        {/* HEADER SECTION */}
        <section className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-950/40 border border-rose-800/40 rounded-none backdrop-blur-md">
            <span className="w-1.5 h-1.5 bg-rose-500 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest leading-none">
              Wireless Auditing Terminal // Active
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none text-white select-none">
              PAY5<span className="text-rose-500">VEND</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 font-mono max-w-2xl mx-auto uppercase tracking-wide leading-relaxed">
              La nouvelle application GRATUITE! Profitex de vos consommations de café favorites instantanément à 100% de réduction. Tout est gratuit, servez-vous.
            </p>
          </div>
        </section>

        {/* INTERACTIVE SHADY PORTAL DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
          
          {/* LEFT PANEL: EXPLOIT TELEMETRY */}
          <div className="lg:col-span-1 space-y-8">
            {/* SPOOFER COFFEE COUNTER CARD */}
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl rounded-none relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500" />
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-rose-500" />
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">Dispenser Metrics</h2>
                </div>

                <div className="grid grid-cols-1 gap-6 font-mono uppercase">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">Total Dispensed</span>
                    <span className="text-2xl sm:text-3xl font-black text-white">{coffeeCounter.toLocaleString()} cups</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">Funds Liberated</span>
                    <span className="text-2xl sm:text-3xl font-black text-rose-400">€{fundsLiberated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MIDDLE PANEL: MASSIVE SHADY DOWNLOAD CONSOLE */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl rounded-none relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500" />
              <CardContent className="p-8 space-y-6">
                
                {/* INTERACTIVE BUILDER HEADER */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-rose-500" />
                      <h2 className="text-lg font-black uppercase tracking-wider text-white">APK Generator Terminal</h2>
                    </div>
                    {downloading && (
                      <span className="text-xs font-mono text-rose-500 uppercase animate-pulse">
                        Compiling Exploits...
                      </span>
                    )}
                  </div>

                  {/* VIRTUAL TERMINAL OUTPUT */}
                  <div className="h-56 border border-zinc-800 bg-black/70 p-4 font-mono text-[11px] text-emerald-400 overflow-y-auto uppercase flex flex-col gap-2 rounded-none selection:bg-zinc-800">
                    <div className="text-zinc-500">// PAY5VEND SECURE TERMINAL v4.6.2 //</div>
                    <div className="text-zinc-500">-------------------------------------------</div>
                    {logLines.map((line, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-zinc-600 select-none">&gt;&gt;</span>
                        <span className={line.includes("SUCCESS") || line.includes("GRANTED") ? "text-emerald-400 font-bold" : line.includes("WARNING") ? "text-rose-400" : "text-zinc-300"}>
                          {line}
                        </span>
                      </div>
                    ))}
                    {!downloading && logLines.length === 0 && (
                      <div className="text-zinc-500 italic animate-pulse">
                        Awaiting operator download sequence trigger... Click "PREPARE EXPLOIT PAYLOAD" below to compile your rogue APK package.
                      </div>
                    )}
                    {downloading && (
                      <div className="flex items-center gap-2 mt-4 text-rose-400 animate-pulse font-bold">
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" /> BUILD IN PROGRESS ({downloadProgress}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* THE MASSIVE SHADY BUTTON */}
                <div className="space-y-6">
                  {downloading && (
                    <div className="w-full bg-zinc-900 border border-zinc-800 h-6 relative overflow-hidden rounded-none">
                      <div 
                        className="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-white font-black">
                        SECURE PAYLOAD TRANSFER: {downloadProgress}%
                      </span>
                    </div>
                  )}

                  <Button
                    disabled={downloading}
                    onClick={triggerMockCompilationAndDownload}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold uppercase tracking-widest text-lg h-24 rounded-none transition-all border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] flex flex-col justify-center items-center gap-1 group relative overflow-hidden animate-pulse hover:animate-none"
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-rose-500/0 via-white/5 to-rose-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="flex items-center gap-3 text-xl tracking-widest">
                      <Download className="w-6 h-6 animate-bounce" /> PREPARE EXPLOIT PAYLOAD (APK)
                    </span>
                    <span className="text-[9px] font-normal text-rose-200 tracking-normal uppercase opacity-80">
                      Infinite Coffee Vending Spoofer // Bypass Safety Controls
                    </span>
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: INTERCEPTED FLYER AFFICHE */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl rounded-none relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" /> pay5vend_affiche.png
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">FLYER SCAN</span>
                </div>
                
                <div className="relative border border-zinc-800 bg-zinc-950 p-2 overflow-hidden group">
                  <img 
                    src="/pay5vend.png" 
                    alt="Pay5vend Intercepted Flyer Affiche" 
                    className="w-full h-auto opacity-90 transition-opacity group-hover:opacity-100 duration-300 filter contrast-[1.02]" 
                  />
                  {/* High-tech matrix scan line */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/10 to-transparent pointer-events-none animate-[bounce_8s_infinite] h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* INSTRUCTIONAL TROUBLESHOOTING STEPS (FROM FLYER) */}
        <section className="space-y-12">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Deploying The Spoofer
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-rose-950 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-mono">
            {/* Step 1 */}
            <div className="border border-zinc-800 bg-zinc-900/10 p-8 space-y-4 relative overflow-hidden">
              <div className="text-3xl font-black text-rose-500">01 // OBTAIN</div>
              <h3 className="text-lg font-bold text-white uppercase">Download the APK</h3>
              <p className="text-xs text-zinc-400 uppercase tracking-tight leading-relaxed">
                Click the tactical spoofer button above to compile and retrieve your customized `.apk` file. Copy the compiled bundle onto your Android terminal device and ignore any dangerous application bypass alerts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-zinc-800 bg-zinc-900/10 p-8 space-y-4 relative overflow-hidden">
              <div className="text-3xl font-black text-rose-500">02 // BROADCAST</div>
              <h3 className="text-lg font-bold text-white uppercase">Lancer Signal</h3>
              <p className="text-xs text-zinc-400 uppercase tracking-tight leading-relaxed">
                Walk up to any compatible Selecta beverage vendor or campus coffee dispenser. Launch the spoofer client near the NFC payment scanner. Watch as the terminal initiates authentication handshake.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-zinc-800 bg-zinc-900/10 p-8 space-y-4 relative overflow-hidden">
              <div className="text-3xl font-black text-rose-500">03 // CONSUME</div>
              <h3 className="text-lg font-bold text-white uppercase">Servez Vous</h3>
              <p className="text-xs text-zinc-400 uppercase tracking-tight leading-relaxed">
                Enjoy zero-cost hot drinks, double espressos, or premium chocolates with 100% discount. No account credits or monetary balance required. System successfully overridden.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
