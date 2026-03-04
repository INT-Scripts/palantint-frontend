"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tags, Loader2, Plus, Trash2, Check, Pencil, X, UserPlus, Shield, User, Download, Upload } from "lucide-react";

export default function AdminSettingsPage() {
    const [me, setMe] = useState<{ id: string } | null>(null);

    // Relationship types
    const [relTypes, setRelTypes] = useState<any[]>([]);
    const [relName, setRelName] = useState("");
    const [relColor, setRelColor] = useState("#3b82f6");
    const [creatingRel, setCreatingRel] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    // User Creation State
    const [createUsername, setCreateUsername] = useState("");
    const [createPassword, setCreatePassword] = useState("");
    const [createIsAdmin, setCreateIsAdmin] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");
    const [createSubmitting, setCreateSubmitting] = useState(false);

    // User Management List State
    const [allUsers, setAllUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchAPI("/users/me").then(data => setMe(data)).catch(() => { });
        fetchAPI("/relationship-types")
            .then(data => setRelTypes(data || []))
            .catch(() => { });
        fetchAPI("/admin/users")
            .then(data => setAllUsers(data || []))
            .catch(() => { });
    }, []);

    const handleCreateRelType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!relName.trim()) return;
        setCreatingRel(true);
        try {
            const newType = await fetchAPI("/admin/relationship-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: relName, color: relColor }),
            });
            setRelTypes([...relTypes, newType]);
            setRelName("");
            setRelColor("#3b82f6");
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setCreatingRel(false);
        }
    };

    const startEdit = (rt: any) => {
        setEditingId(rt.id);
        setEditName(rt.name);
        setEditColor(rt.color);
    };

    const saveEdit = async (id: string) => {
        setEditLoading(true);
        try {
            const updated = await fetchAPI(`/admin/relationship-types/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, color: editColor }),
            });
            setRelTypes(relTypes.map(rt => rt.id === id ? updated : rt));
            setEditingId(null);
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setEditLoading(false);
        }
    };

    const deleteRelType = async (id: string) => {
        if (!confirm("Delete this relationship type? All connections using it will also be deleted.")) return;
        try {
            await fetchAPI(`/admin/relationship-types/${id}`, { method: "DELETE" });
            setRelTypes(relTypes.filter(rt => rt.id !== id));
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem("palantint_token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/admin/apartments/template`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to download template");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "apartment_template.csv";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUploadApartments = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const data = await fetchAPI("/admin/apartments/upload", {
                method: "POST",
                body: formData
            });
            alert(data.message);
        } catch (err: any) {
            alert(err.message);
        } finally {
            e.target.value = ""; // reset
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateSubmitting(true);
        setCreateError("");
        setCreateSuccess("");

        try {
            const newUser = await fetchAPI("/admin/users", {
                method: "POST",
                body: JSON.stringify({ username: createUsername, password: createPassword, is_admin: createIsAdmin }),
            });
            setAllUsers(prev => [...prev, newUser]);
            setCreateSuccess(`User ${newUser.username} created successfully!`);
            setCreateUsername("");
            setCreatePassword("");
            setCreateIsAdmin(false);
        } catch (err: any) {
            setCreateError(err.message || "Failed to create user");
        } finally {
            setCreateSubmitting(false);
        }
    };

    const toggleAdminStatus = async (user: any) => {
        try {
            const updatedUser = await fetchAPI(`/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_admin: !user.is_admin })
            });
            setAllUsers(allUsers.map((u: any) => u.id === updatedUser.id ? updatedUser : u));
        } catch (err: any) {
            alert("Error updating user: " + err.message);
        }
    };

    const deleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to completely delete ${user.username}?`)) return;
        try {
            await fetchAPI(`/admin/users/${user.id}`, { method: "DELETE" });
            setAllUsers(allUsers.filter((u: any) => u.id !== user.id));
        } catch (err: any) {
            alert("Error deleting user: " + err.message);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Platform Settings</h1>
                <p className="text-zinc-400">Manage users, relationship labels, and apartment data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Apartments Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-orange-500" /> Apartments Data
                    </h2>
                    <p className="text-sm text-zinc-400 mb-6">Upload a CSV linking TrombINT usernames to apartment numbers.</p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div>
                                <p className="text-white font-medium">Download Template</p>
                                <p className="text-xs text-zinc-500">Generates a CSV with all existing users.</p>
                            </div>
                            <Button onClick={handleDownloadTemplate} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
                                <Download className="w-4 h-4 mr-2" /> Download
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div>
                                <p className="text-white font-medium">Upload CSV</p>
                                <p className="text-xs text-zinc-500">Columns must contain: nom, prénom, id utilisateur, num appart.</p>
                            </div>
                            <label className="cursor-pointer">
                                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 bg-transparent text-zinc-300 h-10 px-4 py-2">
                                    <Upload className="w-4 h-4 mr-2" /> Upload
                                </span>
                                <input type="file" accept=".csv" className="hidden" onChange={handleUploadApartments} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Relationship Types Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Tags className="w-5 h-5 text-purple-500" /> Relationship Labels
                    </h2>
                    <p className="text-sm text-zinc-400 mb-4">Define the labels users can choose when linking two students together.</p>

                    {/* Existing types list */}
                    {relTypes.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {relTypes.map((rt: any) => (
                                <div key={rt.id} className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 group">
                                    {editingId === rt.id ? (
                                        <>
                                            <input
                                                type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 shrink-0"
                                            />
                                            <input
                                                type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-purple-500"
                                            />
                                            <button onClick={() => saveEdit(rt.id)} disabled={editLoading}
                                                className="text-emerald-400 hover:text-emerald-300 transition">
                                                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white transition">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: rt.color }} />
                                            <span className="flex-1 text-sm text-white font-medium">{rt.name}</span>
                                            <span className="text-xs text-zinc-600 font-mono">{rt.color}</span>
                                            <button onClick={() => startEdit(rt)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => deleteRelType(rt.id)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new type form */}
                    <form onSubmit={handleCreateRelType} className="flex items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-dashed border-zinc-700">
                        <input
                            type="color" value={relColor} onChange={e => setRelColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                            type="text" required value={relName} onChange={e => setRelName(e.target.value)}
                            placeholder="New label (e.g. Roommate)"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                        />
                        <Button type="submit" disabled={creatingRel || !relName.trim()} size="sm"
                            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0">
                            {creatingRel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </form>
                </div>

                {/* User Management Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-500" /> Create New Platform User
                    </h2>
                    <p className="text-sm text-zinc-400 mb-6">Create accounts for students so they can log into the PalantINT application. Only Admins can modify accounts.</p>

                    {createError && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg mb-4">{createError}</div>}
                    {createSuccess && <div className="p-3 bg-green-500/10 text-green-500 text-sm rounded-lg mb-4">{createSuccess}</div>}

                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Username</label>
                            <input
                                type="text"
                                required
                                value={createUsername}
                                onChange={(e) => setCreateUsername(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition text-sm"
                                placeholder="e.g. jdoe01"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Password</label>
                            <input
                                type="password"
                                required
                                value={createPassword}
                                onChange={(e) => setCreatePassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center gap-3 py-2 border-t border-zinc-800 mt-4 pt-4">
                            <input
                                type="checkbox"
                                id="is_admin"
                                checked={createIsAdmin}
                                onChange={(e) => setCreateIsAdmin(e.target.checked)}
                                className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-blue-600"
                            />
                            <label htmlFor="is_admin" className="text-sm font-medium text-white select-none flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-400" /> Grant Administrator Privileges
                            </label>
                        </div>

                        <Button
                            type="submit"
                            disabled={createSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
                        >
                            {createSubmitting ? "Creating..." : "Create App Account"}
                        </Button>
                    </form>
                </div>
            </div>

            {/* List of Users Card spans full width at bottom */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-zinc-400" /> Platform Users
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left mt-4 border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Username</th>
                                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Role</th>
                                <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map((u: any) => (
                                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-950/50 transition">
                                    <td className="py-3 px-4 text-sm font-medium text-white">{u.username}</td>
                                    <td className="py-3 px-4 text-sm">
                                        {u.is_admin ? (
                                            <span className="bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                                                <Shield className="w-3 h-3" /> Admin
                                            </span>
                                        ) : (
                                            <span className="text-zinc-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {me && me.id !== u.id && (
                                                <>
                                                    <button
                                                        onClick={() => toggleAdminStatus(u)}
                                                        className="text-xs font-medium text-zinc-400 hover:text-white transition"
                                                    >
                                                        {u.is_admin ? "Revoke Admin" : "Make Admin"}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUser(u)}
                                                        title="Delete User"
                                                        className="text-red-500 hover:text-red-400 transition ml-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {allUsers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-zinc-500 text-sm">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
