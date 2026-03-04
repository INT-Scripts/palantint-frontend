"use client";

import { useState, useEffect } from "react";
import { fetchAPI, API_BASE_URL } from "@/lib/api";
import { Plus, Image, FileText, Video, Trash2, Loader2, User, X, Download, AlignLeft } from "lucide-react";

interface MediaGalleryProps {
    studentId: string;
    initialMedia: any[];
}

export default function MediaGallery({ studentId, initialMedia }: MediaGalleryProps) {
    const [media, setMedia] = useState(initialMedia || []);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [description, setDescription] = useState("");

    // Lightbox state
    const [selectedMedia, setSelectedMedia] = useState<any>(null);

    // Fetch fresh media on mount to get uploader info
    useEffect(() => {
        fetchAPI(`/students/${studentId}/media`)
            .then(data => {
                const galleryItems = (data || []).filter((m: any) => m.type !== "NOTE");
                setMedia(galleryItems);
            })
            .catch(console.error);
    }, [studentId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Very naive check for type
        const isVideo = file.type.startsWith("video/");
        const type = isVideo ? "VIDEO" : "IMAGE";

        const formData = new FormData();
        formData.append("type", type);
        formData.append("file", file);
        if (authorName.trim()) {
            formData.append("author_name", authorName.trim());
        }
        if (description.trim()) {
            formData.append("content", description.trim());
        }

        setUploading(true);
        setError("");

        try {
            const newMedia = await fetchAPI(`/students/${studentId}/media`, {
                method: "POST",
                body: formData,
            });
            setMedia([newMedia, ...media]);
            setAuthorName(""); // Reset after successful upload
            setDescription(""); // Reset description
            // Reset input so the same file can be uploaded again if needed
            e.target.value = '';
        } catch (err: any) {
            setError(err.message || "Failed to upload media");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (mediaId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm("Delete this media?")) return;
        try {
            await fetchAPI(`/media/${mediaId}`, { method: "DELETE" });
            setMedia(media.filter(m => m.id !== mediaId));
            if (selectedMedia?.id === mediaId) {
                setSelectedMedia(null);
            }
        } catch (err: any) {
            alert("Error deleting media");
        }
    };

    return (
        <div className="h-full flex flex-col pt-2">
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4 mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3 mt-2">
                    <div className="w-2 h-2 bg-blue-500 animate-pulse" />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Evidence Repo
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-blue-500 transition-colors">
                            <div className="px-3 flex items-center pointer-events-none border-r border-zinc-800">
                                <User className="h-4 w-4 text-blue-500/50" />
                            </div>
                            <input
                                type="text"
                                placeholder="OP_SIGNATURE (OPTIONAL)"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                disabled={uploading}
                                className="w-full sm:w-40 xl:w-48 bg-transparent text-white text-[10px] font-mono uppercase tracking-widest p-2 outline-none"
                            />
                        </div>

                        <div className="relative w-full sm:w-auto flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-blue-500 transition-colors">
                            <div className="px-3 flex items-center pointer-events-none border-r border-zinc-800">
                                <AlignLeft className="h-4 w-4 text-blue-500/50" />
                            </div>
                            <input
                                type="text"
                                placeholder="EVIDENCE_DESCRIPTION"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={uploading}
                                className="w-full sm:w-48 xl:w-64 bg-transparent text-white text-[10px] font-mono uppercase tracking-widest p-2 outline-none"
                            />
                        </div>
                    </div>

                    <label className="cursor-pointer bg-zinc-900 border border-blue-500/50 hover:bg-blue-600 hover:border-blue-500 text-blue-400 hover:text-white px-4 py-2 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors disabled:opacity-50 shrink-0 w-full sm:w-auto">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {uploading ? "TRANSMITTING..." : "UPLOAD_ASSET"}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono uppercase tracking-widest mb-6">ERROR: {error}</div>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {media.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-zinc-950/30 border border-dashed border-zinc-800 flex flex-col items-center justify-center">
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No Assets Logged</span>
                    </div>
                ) : (
                    media.map((item) => (
                        <div
                            key={item.id}
                            className="relative group overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 aspect-square cursor-pointer transition-colors"
                            onClick={() => setSelectedMedia(item)}
                        >
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500/50 m-2 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-500/50 m-2 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            {item.type === "IMAGE" ? (
                                <img
                                    src={`${API_BASE_URL}/media/${item.id}/file`}
                                    alt="Student upload"
                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110 grayscale group-hover:grayscale-0"
                                    onError={(e) => { e.currentTarget.src = "/fallback-image.png" }}
                                />
                            ) : item.type === "VIDEO" ? (
                                <div className="w-full h-full relative">
                                    <video
                                        src={`${API_BASE_URL}/media/${item.id}/file`}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-colors">
                                        <Video className="w-8 h-8 text-white/50 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-900 border border-dashed border-zinc-800/50 text-center">
                                    <FileText className="w-8 h-8 text-blue-500/50 mb-2" />
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{item.content || "FILE_DATA"}</p>
                                </div>
                            )}

                            {/* Hover overlay for grid */}
                            <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                            
                            <div className="absolute inset-0 flex flex-col justify-between p-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-end">
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="p-1.5 bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                        title="PURGE ASSET"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="bg-zinc-950/90 border border-zinc-800 p-2 backdrop-blur-md self-start w-full">
                                    <p className="font-black text-white text-[10px] uppercase tracking-wider mb-1 truncate flex items-center gap-1.5">
                                        {item.type === "VIDEO" ? <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse inline-block" /> : <span className="w-1.5 h-1.5 bg-blue-500 inline-block" />}
                                        {item.author_name ? `OP_${item.author_name}` : "UNKNOWN_SRC"}
                                    </p>
                                    {item.content && (
                                        <p className="text-zinc-400 font-mono italic truncate mb-1 text-[9px] border-l border-blue-500/50 pl-2">
                                            "{item.content}"
                                        </p>
                                    )}
                                    <p className="text-blue-500/50 font-mono text-[8px] uppercase tracking-widest" title={`Uploaded at: ${new Date(item.uploaded_at).toLocaleString()}`}>
                                        SYS_ID: {item.uploader_username || "anonymous"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox Modal */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col p-4 md:p-8"
                    onClick={() => setSelectedMedia(null)}
                >
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 animate-pulse border border-blue-400" />
                            <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                                ASSET_VIEWER // ID:{selectedMedia.id.slice(0, 8)}
                            </h2>
                        </div>
                        <button
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setSelectedMedia(null); }}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div
                        className="flex-1 flex items-center justify-center relative min-h-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedMedia.type === "IMAGE" ? (
                            <img
                                src={`${API_BASE_URL}/media/${selectedMedia.id}/file`}
                                alt="Enlarged media"
                                className="max-w-full max-h-full object-contain border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                            />
                        ) : selectedMedia.type === "VIDEO" ? (
                            <video
                                src={`${API_BASE_URL}/media/${selectedMedia.id}/file`}
                                className="max-w-full max-h-full border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                                controls
                                autoPlay
                            />
                        ) : null}
                        
                        {/* Dossier info panel over image */}
                        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-zinc-950/90 border border-zinc-800 p-4 backdrop-blur-md shadow-2xl flex flex-col gap-4">
                            <div className="space-y-1 border-b border-zinc-800 pb-3">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 inline-block" />
                                    {selectedMedia.author_name ? `OP_${selectedMedia.author_name}` : "UNKNOWN_SRC"}
                                </h3>
                                {selectedMedia.content && (
                                    <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed pt-2">
                                        &gt; {selectedMedia.content}
                                    </p>
                                )}
                                <p className="text-[10px] font-mono text-zinc-600 mt-2 uppercase tracking-widest pt-2">
                                    SYS_ID: <span className="text-blue-500/70">{selectedMedia.uploader_username || "anonymous"}</span> // {selectedMedia.uploaded_at ? new Date(selectedMedia.uploaded_at).toISOString() : 'NO_DATE'}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <a
                                    href={`${API_BASE_URL}/media/${selectedMedia.id}/file`}
                                    download={`media-${selectedMedia.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-blue-500 hover:text-blue-400 text-zinc-300 font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-3 h-3" /> Extract
                                </a>
                                <button
                                    onClick={(e) => {
                                        handleDelete(selectedMedia.id, e);
                                        if (confirm("Delete this asset?")) setSelectedMedia(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-red-950/30 border border-red-900/50 hover:border-red-500 hover:bg-red-500 hover:text-white text-red-500 font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" /> Purge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
