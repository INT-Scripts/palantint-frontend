"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Link2, Github, Instagram, Linkedin, Twitter, Users, Briefcase, Plus, Trash2, X, Check, Loader2 } from "lucide-react";

interface SidebarProps {
    student: any;
    onUpdate: (data: any) => void;
}

export default function SocialsClubsSidebar({ student, onUpdate }: SidebarProps) {
    const [socials, setSocials] = useState(student.social_links || []);
    const [clubs, setClubs] = useState(student.clubs || []);

    const router = useRouter();

    // Add Social form state
    const [showAddSocial, setShowAddSocial] = useState(false);
    const [socialForm, setSocialForm] = useState({ platform: "Instagram", username: "", url: "" });
    const [socialLoading, setSocialLoading] = useState(false);

    // Add Club form state
    const [showAddClub, setShowAddClub] = useState(false);
    const [allClubs, setAllClubs] = useState<any[]>([]);
    const [clubForm, setClubForm] = useState({ club_id: "", role: "Member", is_mandat: false });
    const [clubLoading, setClubLoading] = useState(false);

    const PLATFORMS = ["Instagram", "LinkedIn", "GitHub", "Twitter/X", "Website", "Other"];

    const getIcon = (platform: string) => {
        const plat = platform.toLowerCase();
        if (plat.includes("insta")) return <Instagram className="w-4 h-4" />;
        if (plat.includes("link")) return <Linkedin className="w-4 h-4" />;
        if (plat.includes("git")) return <Github className="w-4 h-4" />;
        if (plat.includes("twit") || plat.includes("x")) return <Twitter className="w-4 h-4" />;
        return <Link2 className="w-4 h-4" />;
    };

    const removeSocial = async (id: string) => {
        try {
            await fetchAPI(`/students/${student.id}/socials/${id}`, { method: "DELETE" });
            const updated = socials.filter((s: any) => s.id !== id);
            setSocials(updated);
            onUpdate({ ...student, social_links: updated });
        } catch (e) {
            console.error(e);
        }
    };

    const addSocial = async () => {
        if (!socialForm.username || !socialForm.url) return;
        setSocialLoading(true);
        try {
            const newSocial = await fetchAPI(`/students/${student.id}/socials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(socialForm),
            });
            const updated = [...socials, newSocial];
            setSocials(updated);
            onUpdate({ ...student, social_links: updated });
            setSocialForm({ platform: "Instagram", username: "", url: "" });
            setShowAddSocial(false);
        } catch (e) {
            console.error(e);
        } finally {
            setSocialLoading(false);
        }
    };

    const loadClubs = async () => {
        try {
            const data = await fetchAPI("/clubs");
            setAllClubs(data);
            if (data.length > 0) setClubForm(f => ({ ...f, club_id: data[0].id }));
        } catch (e) {
            console.error(e);
        }
    };

    const addClub = async () => {
        if (!clubForm.club_id) return;
        setClubLoading(true);
        try {
            const result = await fetchAPI(`/students/${student.id}/clubs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(clubForm),
            });
            // Re-fetch the student to get the full club info with name
            const updatedStudent = await fetchAPI(`/students/${student.id}`);
            setClubs(updatedStudent.clubs || []);
            onUpdate(updatedStudent);
            setClubForm({ club_id: allClubs[0]?.id || "", role: "Member", is_mandat: false });
            setShowAddClub(false);
        } catch (e) {
            console.error(e);
        } finally {
            setClubLoading(false);
        }
    };

    const removeClub = async (clubId: string) => {
        try {
            await fetchAPI(`/students/${student.id}/clubs/${clubId}`, { method: "DELETE" });
            const updated = clubs.filter((c: any) => c.club_id !== clubId);
            setClubs(updated);
            onUpdate({ ...student, clubs: updated });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">

            {/* Social Links Block */}
            <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800 p-5 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative group">
                {/* Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-transparent group-hover:from-blue-500 transition-colors" />

                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        Network Links
                    </h3>
                    <button
                        onClick={() => setShowAddSocial(!showAddSocial)}
                        className="text-zinc-500 hover:text-blue-400 transition font-mono text-xs font-black flex items-center tracking-widest"
                    >
                        {showAddSocial ? "Abort" : "+ Append"}
                    </button>
                </div>

                {/* Add Social Form */}
                {showAddSocial && (
                    <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 shadow-inner space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Initialize New Link</span>
                        </div>
                        <select
                            value={socialForm.platform}
                            onChange={e => {
                                const newPlat = e.target.value;
                                const cleanUser = socialForm.username.replace(/^@/, '');
                                let newUrl = socialForm.url;
                                if (cleanUser && newPlat !== "Other" && newPlat !== "Website") {
                                    if (newPlat === "Instagram") newUrl = `https://instagram.com/${cleanUser}`;
                                    else if (newPlat === "LinkedIn") newUrl = `https://linkedin.com/in/${cleanUser}`;
                                    else if (newPlat === "GitHub") newUrl = `https://github.com/${cleanUser}`;
                                    else if (newPlat === "Twitter/X") newUrl = `https://x.com/${cleanUser}`;
                                }
                                setSocialForm({ ...socialForm, platform: newPlat, url: newUrl });
                            }}
                            className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-500 transition-colors"
                        >
                            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder="Identifier (e.g. johndoe)"
                            value={socialForm.username}
                            onChange={e => {
                                const newUser = e.target.value;
                                const cleanUser = newUser.replace(/^@/, '');
                                let newUrl = socialForm.url;
                                const plat = socialForm.platform;
                                if (plat !== "Other" && plat !== "Website") {
                                    if (plat === "Instagram") newUrl = `https://instagram.com/${cleanUser}`;
                                    else if (plat === "LinkedIn") newUrl = `https://linkedin.com/in/${cleanUser}`;
                                    else if (plat === "GitHub") newUrl = `https://github.com/${cleanUser}`;
                                    else if (plat === "Twitter/X") newUrl = `https://x.com/${cleanUser}`;
                                }
                                setSocialForm({ ...socialForm, username: newUser, url: newUrl });
                            }}
                            className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-blue-500 transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="Direct URL Route"
                            value={socialForm.url}
                            onChange={e => setSocialForm({ ...socialForm, url: e.target.value })}
                            className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            onClick={addSocial}
                            disabled={socialLoading || !socialForm.username || !socialForm.url}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-mono tracking-widest uppercase py-3 flex items-center justify-center gap-2 transition-colors mt-2"
                        >
                            {socialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Execute Link
                        </button>
                    </div>
                )}

                {socials.length === 0 && !showAddSocial ? (
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No Network Data Found</p>
                ) : (
                    <ul className="space-y-2">
                        {socials.map((link: any) => (
                            <li key={link.id} className="group relative border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 transition-colors">
                                {/* Hover Target Line */}
                                <div className="absolute top-0 left-0 w-0 h-full bg-blue-500 group-hover:w-1 transition-all duration-300" />
                                
                                <div className="flex items-center justify-between p-3 pl-4">
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <div className="text-zinc-500 group-hover:text-blue-400 transition-colors">
                                            {getIcon(link.platform)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{link.platform}</span>
                                            <span className="text-sm font-black tracking-wide">@{link.username}</span>
                                        </div>
                                    </a>
                                    <button
                                        onClick={() => removeSocial(link.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-colors p-2"
                                        title="Purge Link"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Clubs Block */}
            <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800 p-5 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative group">
                {/* Accent Line */}
                <div className="absolute top-0 right-0 w-1/2 h-1 bg-gradient-to-l from-emerald-500 to-transparent group-hover:from-emerald-400 transition-colors" />
                
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-emerald-500" /> Organization Ties
                    </h3>
                    <button
                        onClick={() => {
                            setShowAddClub(!showAddClub);
                            if (!showAddClub && allClubs.length === 0) loadClubs();
                        }}
                        className="text-zinc-500 hover:text-emerald-400 transition font-mono text-xs font-black flex items-center tracking-widest"
                    >
                        {showAddClub ? "Abort" : "+ Append"}
                    </button>
                </div>

                {/* Add Club Form */}
                {showAddClub && (
                    <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 shadow-inner space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Initialize Org Link</span>
                        </div>
                        {allClubs.length === 0 ? (
                            <p className="text-xs font-mono text-red-400">FAILURE: NO ASSIGNABLE ORGS FOUND</p>
                        ) : (
                            <>
                                {(() => {
                                    const groupedClubs = allClubs.reduce((acc, club) => {
                                        const origin = club.association_of_origin || club.type || "Other";
                                        if (!acc[origin]) acc[origin] = [];
                                        acc[origin].push(club);
                                        return acc;
                                    }, {} as Record<string, any[]>);

                                    const sortedOrigins = Object.keys(groupedClubs).sort((a, b) => {
                                        if (a.includes("Bureau")) return -1;
                                        if (b.includes("Bureau")) return 1;
                                        return a.localeCompare(b);
                                    });

                                    Object.values(groupedClubs).forEach((list: any) =>
                                        list.sort((a: any, b: any) => a.name.localeCompare(b.name))
                                    );

                                    return (
                                        <select
                                            value={clubForm.club_id}
                                            onChange={e => setClubForm({ ...clubForm, club_id: e.target.value })}
                                            className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500 transition-colors"
                                        >
                                            {sortedOrigins.map(origin => (
                                                <optgroup key={origin} label={`// ${origin.toUpperCase()}`}>
                                                    {groupedClubs[origin].map((c: any) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    );
                                })()}
                                <input
                                    type="text"
                                    placeholder="Designation Role (e.g. Operative)"
                                    value={clubForm.role}
                                    onChange={e => setClubForm({ ...clubForm, role: e.target.value })}
                                    className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
                                />
                                <label className="flex items-center gap-3 p-2 border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700 transition">
                                    <input
                                        type="checkbox"
                                        checked={clubForm.is_mandat}
                                        onChange={e => setClubForm({ ...clubForm, is_mandat: e.target.checked })}
                                        className="accent-emerald-500 w-4 h-4"
                                    />
                                    <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">Executive Clearance (Mandat)</span>
                                </label>
                                <button
                                    onClick={addClub}
                                    disabled={clubLoading || !clubForm.club_id}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-mono tracking-widest uppercase py-3 flex items-center justify-center gap-2 transition-colors mt-2"
                                >
                                    {clubLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Authorize Assignment
                                </button>
                            </>
                        )}
                    </div>
                )}

                {clubs.length === 0 && !showAddClub ? (
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No Affiliations Detected</p>
                ) : (
                    <ul className="space-y-2">
                        {clubs.map((affil: any) => (
                            <li key={affil.club_id} className="group relative border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 transition-colors">
                                <div className="absolute top-0 left-0 w-0 h-full bg-emerald-500 group-hover:w-1 transition-all duration-300" />
                                
                                <div className="flex items-center justify-between p-3 pl-4">
                                    <div
                                        onClick={() => router.push(`/clubs/${affil.club_id}`)}
                                        className="cursor-pointer flex-1 min-w-0"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider truncate group-hover:text-emerald-400 transition-colors">
                                                {affil.club_name || `ENTITY_${affil.club_id}`}
                                            </h4>
                                            {affil.is_mandat && (
                                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] font-mono border border-amber-500/30 uppercase">
                                                    Exec
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase truncate border-l border-zinc-700 pl-2">
                                            {affil.role || "OPERATIVE"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeClub(affil.club_id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-colors p-2"
                                        title="Sever Link"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );
}
