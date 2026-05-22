"use client";

import { useState, useEffect } from "react";
import { fetchAPI, API_BASE_URL } from "@/lib/api";
import { Plus, Image, FileText, Video, Trash2, User, X, Download, AlignLeft } from "lucide-react";

interface MediaGalleryProps {
    studentId: string;
    initialMedia: any[];
    themeColor: string;
}

export default function MediaGallery({ studentId, initialMedia, themeColor }: MediaGalleryProps) {
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
            setAuthorName(""); 
            setDescription(""); 
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
                    <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: themeColor }} />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Media
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto flex items-center bg-zinc-950 border border-zinc-800 transition-colors" style={{ borderColor: 'var(--focus-color, #27272a)' }}>
                            <div className="px-3 flex items-center pointer-events-none border-r border-zinc-800">
                                <User className="h-4 w-4" style={{ color: `${themeColor}80` }} />
                            </div>
                            <input
                                type="text"
                                placeholder="Source (OPTIONAL)"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                disabled={uploading}
                                className="w-full sm:w-40 xl:w-48 bg-transparent text-white text-[10px] font-mono uppercase tracking-widest p-2 outline-none"
                            />
                        </div>

                        <div className="relative w-full sm:w-auto flex items-center bg-zinc-950 border border-zinc-800 transition-colors">
                            <div className="px-3 flex items-center pointer-events-none border-r border-zinc-800">
                                <AlignLeft className="h-4 w-4" style={{ color: `${themeColor}80` }} />
                            </div>
                            <input
                                type="text"
                                placeholder="MEDIA DESCRIPTION"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={uploading}
                                className="w-full sm:w-48 xl:w-64 bg-transparent text-white text-[10px] font-mono uppercase tracking-widest p-2 outline-none"
                            />
                        </div>
                    </div>

                    <label className="cursor-pointer bg-zinc-900 border px-4 py-2 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors disabled:opacity-50 shrink-0 w-full sm:w-auto hover:text-white" style={{ borderColor: `${themeColor}80`, color: themeColor }}>
                        <Plus className="w-4 h-4" />
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

            {error && <div className="p-3 bg-comms-500/10 border border-comms-500/30 text-comms-500 text-xs font-mono uppercase tracking-widest mb-6">ERROR: {error}</div>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {media.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-zinc-950/30 border border-dashed border-zinc-800 flex flex-col items-center justify-center">
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">No Assets Logged</span>
                    </div>
                ) : (
                    media.map((item) => (
                        <div
                            key={item.id}
                            className="relative group overflow-hidden bg-zinc-950 border border-zinc-800 aspect-square cursor-pointer transition-colors"
                            style={{ borderColor: 'rgba(39, 39, 42, 1)' }} // Standard zinc-800
                            onClick={() => setSelectedMedia(item)}
                        >
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r m-2 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: themeColor }} />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l m-2 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: themeColor }} />
                            
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
                                        <Video className="w-8 h-8 text-white/50 transition-colors" />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-900 border border-dashed border-zinc-800/50 text-center">
                                    <FileText className="w-8 h-8 mb-2" style={{ color: `${themeColor}80` }} />
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{item.content || "FILE_DATA"}</p>
                                </div>
                            )}

                            {/* Hover overlay for grid */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" style={{ backgroundColor: `${themeColor}20`, mixBlendMode: 'multiply' }} />
                            
                            <div className="absolute inset-0 flex flex-col justify-between p-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-end">
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="p-1.5 bg-comms-500/20 border border-comms-500/50 text-comms-500 hover:bg-comms-500 hover:text-white transition-colors"
                                        title="PURGE ASSET"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="bg-zinc-950/90 border border-zinc-800 p-2 backdrop-blur-md self-start w-full">
                                    <p className="font-black text-white text-[10px] uppercase tracking-wider mb-1 truncate flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 inline-block" style={{ backgroundColor: themeColor }} />
                                        {item.author_name ? `OP_${item.author_name}` : "UNKNOWN_SRC"}
                                    </p>
                                    {item.content && (
                                        <p className="text-zinc-400 font-mono italic truncate mb-1 text-[9px] border-l pl-2" style={{ borderColor: `${themeColor}80` }}>
                                            "{item.content}"
                                        </p>
                                    )}
                                    <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: `${themeColor}80` }} title={`Uploaded at: ${new Date(item.uploaded_at).toLocaleString()}`}>
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
                    className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col p-4 md:p-8 animate-in fade-in duration-200"
                    onClick={() => setSelectedMedia(null)}
                >
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 animate-pulse border" style={{ backgroundColor: themeColor, borderColor: themeColor }} />
                            <h2 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                                ASSET_VIEWER // ID:{selectedMedia.id.slice(0, 8)}
                            </h2>
                        </div>
                        <button
                            className="p-2 text-zinc-500 hover:text-comms-500 hover:bg-comms-500/10 border border-transparent hover:border-comms-500/30 transition-colors"
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
                        
                        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-zinc-950/90 border border-zinc-800 p-4 backdrop-blur-md shadow-2xl flex flex-col gap-4">
                            <div className="space-y-1 border-b border-zinc-800 pb-3">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 inline-block" style={{ backgroundColor: themeColor }} />
                                    {selectedMedia.author_name ? `OP_${selectedMedia.author_name}` : "UNKNOWN_SRC"}
                                </h3>
                                {selectedMedia.content && (
                                    <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed pt-2">
                                        &gt; {selectedMedia.content}
                                    </p>
                                )}
                                <p className="text-[10px] font-mono text-zinc-600 mt-2 uppercase tracking-widest pt-2">
                                    SYS_ID: <span style={{ color: `${themeColor}B3` }}>{selectedMedia.uploader_username || "anonymous"}</span> // {selectedMedia.uploaded_at ? new Date(selectedMedia.uploaded_at).toISOString() : 'NO_DATE'}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <a
                                    href={`${API_BASE_URL}/media/${selectedMedia.id}/file`}
                                    download={`media-${selectedMedia.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
                                    style={{ borderColor: `${themeColor}80` }}
                                >
                                    <Download className="w-3 h-3" /> Extract
                                </a>
                                <button
                                    onClick={(e) => {
                                        handleDelete(selectedMedia.id, e);
                                        if (confirm("Delete this asset?")) setSelectedMedia(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-comms-950/30 border border-comms-900/50 hover:border-comms-500 hover:bg-comms-500 hover:text-white text-comms-500 font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
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
