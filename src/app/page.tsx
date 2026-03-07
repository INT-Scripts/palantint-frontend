"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { User, Search, MapPin, Briefcase, Eye, Clock, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);

  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  const loadStudents = (currentSkip: number, currentSearch: string, append: boolean = false) => {
    if (!append) setLoading(true);

    let url = `/students?limit=24&skip=${currentSkip}`;
    if (currentSearch) {
      url += `&q=${currentSearch}`;
    }

    fetchAPI(url)
      .then(res => {
        if (append) {
          setStudents(prev => [...prev, ...res]);
        } else {
          setStudents(res);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents(0, search, false);
  }, [search]);

  useEffect(() => {
    fetchAPI("/students/recent")
      .then(res => setRecentlyViewed(res))
      .catch(() => { });
  }, []);

  const handleLoadMore = () => {
    const nextSkip = skip + 24;
    setSkip(nextSkip);
    loadStudents(nextSkip, search, true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-blue-500/30">
      
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[30%] right-[-10%] w-[35%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
        <div className="space-y-12">

          {/* Hero Section */}
          <PageHeader
            badgeText="System Active // Global Network"
            title1="Student"
            title2="Directory"
            titleGradient="from-blue-500 via-indigo-400 to-purple-600"
            subtitle="Directory access. Access student, association, and housing information."
            colorName="blue"
            searchPlaceholder="EXEC QUERY: NAME / DEPT / ID..."
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setSkip(0);
            }}
          />

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <div className="space-y-6 pt-8 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                  <div className="w-1.5 h-6 bg-purple-500" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">Cache / Récents</span>
                </h2>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar snap-x">
                {recentlyViewed.map((student, i) => (
                  <Card
                    key={`${student.id}-${i}`}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className="snap-start w-72 shrink-0 p-0 border-y border-r border-l-2 hover:border-l-purple-500 hover:bg-zinc-900/90 cursor-pointer transition-all hover:-translate-y-1 group"
                  >
                    <CardContent className="p-4 flex items-center gap-4 relative">
                      <div className="absolute top-0 right-0 p-1.5 bg-zinc-900 border-b border-l border-zinc-800 text-[9px] font-mono text-zinc-600">ID:{student.id}</div>
                      <Avatar className="h-14 w-14 rounded-none border border-zinc-700 ring-1 ring-zinc-800 group-hover:ring-purple-500/50 transition-all">
                        <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image`} alt={student.first_name} className="object-cover" />
                        <AvatarFallback className="bg-zinc-900 text-zinc-500 rounded-none font-mono">
                          {student.first_name?.[0] || <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 pt-2">
                        <p className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition-colors uppercase tracking-wide">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono truncate">{student.promo || "UNKNOWN_CLASS"}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Directory Grid */}
          <div className="space-y-8 pt-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-zinc-800 pb-4 gap-4">
              <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <User className="w-6 h-6 text-blue-500" /> 
                </div>
                Base de données
              </h2>
              <span className="text-xs text-blue-400 font-mono bg-blue-500/5 px-4 py-1.5 border border-blue-500/20 backdrop-blur-sm uppercase tracking-widest">
                Connexion établie // Live
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-zinc-900/30 h-[320px] border border-zinc-800/40" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                {students.map((student, index) => (
                  <Card
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className="group hover:border-blue-500/50 cursor-pointer hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.2)] hover:-translate-y-2 p-0"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Futuristic Corner Accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-zinc-700 group-hover:border-blue-400 transition-colors z-20 m-2" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-zinc-700 group-hover:border-blue-400 transition-colors z-20 m-2" />

                    <div className="w-full h-32 bg-zinc-900/50 absolute top-0 left-0 border-b border-zinc-800/80 group-hover:bg-blue-900/10 transition-colors z-0" />
                    
                    <CardContent className="p-0 flex flex-col items-center">
                      <Avatar className="h-32 w-32 border border-zinc-700 group-hover:border-blue-500 transition-all duration-500 mt-12 mb-6 shadow-2xl z-10 rounded-none group-hover:scale-105">
                        <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image`} alt={student.first_name} className="object-cover" />
                        <AvatarFallback className="bg-zinc-900 text-zinc-500 text-3xl font-black rounded-none">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <h3 className="text-xl font-black text-white text-center leading-tight group-hover:text-blue-400 transition-colors z-10 w-full truncate px-4 uppercase tracking-wide">
                        {student.first_name} <br/> {student.last_name}
                      </h3>
                      
                      <div className="flex flex-col w-full px-6 mt-6 mb-4 z-10 gap-2">
                        {student.promo && (
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase">Level</span>
                            <span className="font-mono text-xs text-blue-400 font-bold">{student.promo}</span>
                          </div>
                        )}
                        {student.ecole && (
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase">Div</span>
                            <span className="font-mono text-xs text-purple-400 font-bold max-w-[120px] truncate" title={student.ecole}>{student.ecole}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && students.length >= 24 && (
              <div className="mt-16 flex justify-center pb-12 w-full">
                <Button 
                  onClick={handleLoadMore} 
                  variant="outline"
                  size="lg"
                  className="w-full max-w-md bg-zinc-950 hover:bg-zinc-900 border-x-0 border-y-2 border-zinc-800 hover:border-blue-500 text-white font-mono uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,0,0,1)] hover:text-blue-400 group h-14 rounded-none transition-all"
                >
                  Fetch Additional Records
                  <ChevronRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform text-blue-500" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
