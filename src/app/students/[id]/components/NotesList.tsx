"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Plus, Trash2, Loader2, StickyNote, User } from "lucide-react";
import { format } from "date-fns";

interface NotesListProps {
    studentId: string;
}

export default function NotesList({ studentId }: NotesListProps) {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [error, setError] = useState("");

    // Fetch notes on mount
    useEffect(() => {
        fetchAPI(`/students/${studentId}/media`)
            .then(data => {
                const noteItems = (data || []).filter((m: any) => m.type === "NOTE");
                setNotes(noteItems);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [studentId]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        const formData = new FormData();
        formData.append("type", "NOTE");
        formData.append("content", newNote.trim());
        if (authorName.trim()) {
            formData.append("author_name", authorName.trim());
        }

        setSubmitting(true);
        setError("");

        try {
            const addedNote = await fetchAPI(`/students/${studentId}/media`, {
                method: "POST",
                body: formData,
            });
            setNotes([addedNote, ...notes]);
            setNewNote("");
        } catch (err: any) {
            setError(err.message || "Failed to add note");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm("Delete this note?")) return;
        try {
            await fetchAPI(`/media/${noteId}`, { method: "DELETE" });
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (err: any) {
            alert("Error deleting note");
        }
    };

    return (
        <div className="h-full flex flex-col pt-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 animate-pulse" />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Observer Logs
                    </h2>
                </div>
            </div>

            {/* Add Note Form */}
            <div className="bg-zinc-950/80 border border-zinc-800 p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] space-y-4 relative mb-6 group">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 m-2 pointer-events-none" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 m-2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 m-2 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 m-2 pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Initialize Log Entry</span>
                </div>

                <textarea
                    placeholder="Enter observation data..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-zinc-900 border border-zinc-700/50 p-3 text-xs font-mono text-amber-50 placeholder-zinc-600 outline-none focus:border-amber-500 transition-colors min-h-[100px] resize-y leading-relaxed"
                />
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <User className="h-4 w-4 text-amber-500/50 shrink-0" />
                        <input
                            type="text"
                            placeholder="Signatory ID (Optional)"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            disabled={submitting}
                            className="w-full sm:w-64 bg-zinc-900 border border-zinc-700/50 text-white text-xs font-mono uppercase tracking-wider pl-3 pr-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleAddNote}
                        disabled={submitting || !newNote.trim()}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-2.5 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-colors"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {submitting ? "ENCODING..." : "COMMIT_LOG"}
                    </button>
                </div>
                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono uppercase tracking-widest mt-2">ERROR: {error}</div>}
            </div>

            {/* Notes List */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-amber-500 animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Decrypting Logs...</span>
                </div>
            ) : notes.length === 0 ? (
                <div className="py-16 text-center bg-zinc-950/30 border border-dashed border-zinc-800 flex flex-col items-center justify-center">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No Observation Data Found</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map((note) => (
                        <div key={note.id} className="relative group bg-zinc-900 border border-zinc-800 p-5 hover:border-amber-500/50 transition-colors flex flex-col">
                            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 group-hover:bg-amber-500 transition-colors" />
                            
                            <div className="flex-1 pl-3">
                                <p className="text-amber-50/80 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                    {note.content}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-between items-end pl-3 relative">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-amber-500/50" />
                                        <p className="font-black text-amber-500 uppercase tracking-widest text-[10px]">
                                            {note.author_name || "UNKNOWN_OP"}
                                        </p>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                                        SYS_ID: {note.uploader_username || "anonymous"} // {format(new Date(note.uploaded_at), "dd.MM.yyyy HH:mm")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30 absolute right-0 bottom-0"
                                    title="PURGE LOG"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
