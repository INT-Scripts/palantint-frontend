"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPrivate, getStudentImageUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    ArrowLeft, User, GraduationCap
} from "lucide-react";

export default function ClassGroupDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadGroup = useCallback(() => {
        if (!id) return;
        fetchPrivate(`/class-groups/${id}`)
            .then(data => {
                setGroup(data);
                document.title = `Class ${data.name}`;
            })
            .catch(err => {
                console.error("Error fetching class details", err);
                setError("Class group not found.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        loadGroup();
    }, [id, loadGroup]);

    if (!loading && (error || !group)) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-mono uppercase text-xs tracking-widest">
                <div className="flex-1 flex flex-col items-center justify-center pt-20">
                    <p className="text-zinc-500">{error || "CLASS_OFFLINE"}</p>
                    <button onClick={() => router.back()} className="mt-4 text-student-500 hover:text-white transition-colors border border-student-500/30 px-4 py-2 bg-student-500/5">
                        Return
                    </button>
                </div>
            </div>
        );
    }

    if (!group) return <div className="min-h-screen bg-zinc-950" />;

    const members = group.members || [];

    const MemberCard = ({ member }: { member: any }) => (
        <Card
            onClick={() => router.push(`/palantint/students/${member.student_id}`)}
            className="p-0 border-zinc-800 hover:border-student-500 transition-all cursor-pointer group flex flex-col relative overflow-hidden rounded-none bg-zinc-900/40 backdrop-blur-xl"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-student-500 transition-colors z-10" />
            
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex items-center gap-4 p-4 border-b border-zinc-800/60 flex-1 relative">
                    <Avatar className="w-12 h-12 bg-zinc-900 shrink-0 border border-zinc-800 group-hover:border-student-500/50 transition-all rounded-none">
                        <AvatarImage src={getStudentImageUrl(member.student_id)} alt={member.first_name} className="object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all rounded-none" />
                        <AvatarFallback className="bg-transparent rounded-none">
                            <User className="w-6 h-6 text-zinc-600 group-hover:text-student-500 transition-colors" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-sm font-black text-white leading-tight uppercase tracking-wide truncate group-hover:text-student-400 transition-colors">
                            {member.first_name} {member.last_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-student-500 font-mono tracking-widest uppercase truncate">{member.role || "STUDENT"}</p>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-2 bg-zinc-950/40 flex justify-between items-center group-hover:bg-student-500/5 transition-colors">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-tight">LEVEL_{member.promo || "XX"}</span>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase truncate max-w-[100px] tracking-tight" title={member.ecole}>{member.ecole || "N/A"}</span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24 selection:bg-student-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div 
                    className="absolute top-[10%] right-[10%] w-[30%] h-[40%] blur-[150px] rounded-none mix-blend-screen opacity-20 bg-student-600/10" 
                />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="group text-zinc-500 hover:text-zinc-100 font-mono uppercase text-[10px] tracking-widest rounded-none p-0 flex items-center transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
                        Go Back
                    </button>
                </div>

                {/* Header Profile Card */}
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-8 mb-12 relative shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-10 rounded-none overflow-hidden">
                    {/* Top Color Bar spanning full width */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-student-500" />
                    
                    <div className="w-32 h-32 bg-zinc-900 flex flex-shrink-0 items-center justify-center overflow-hidden border border-zinc-800 shadow-inner rounded-none relative">
                        <GraduationCap className="w-16 h-16 text-student-500" />
                        <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mix-blend-difference">{group.name}</h1>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800">
                                <span className="w-1.5 h-1.5 bg-student-500" />
                                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                                    Type: Academic Cohort
                                </span>
                            </div>
                        </div>
                        <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-mono border-l-2 border-zinc-800 pl-6 text-left uppercase tracking-tight">
                            Official administrative registration group for the student body directory.
                        </p>
                    </div>
                </div>

                {/* Roster Grid */}
                <section className="mb-20">
                    <div className="flex items-center gap-6 mb-10">
                        <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-white">
                            <GraduationCap className="w-6 h-6 text-student-500" /> Roster (Operatives Count: {members.length})
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-student-500/20 to-transparent" />
                    </div>
                    
                    {members.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {members.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                        </div>
                    ) : (
                        <div className="text-center py-24 border border-dashed border-zinc-800 bg-zinc-900/20 rounded-none">
                            <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <h3 className="text-sm font-mono font-bold text-zinc-600 uppercase tracking-widest">No student accounts assigned in directory</h3>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
