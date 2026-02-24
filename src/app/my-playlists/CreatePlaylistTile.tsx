"use client";

import { useState } from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { createPlaylist } from "@/actions/playlists";

export function CreatePlaylistTile({ onCreated }: { onCreated: () => void }) {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        const res = await createPlaylist(name);
        setIsCreating(false);

        if (res.success) {
            setName("");
            onCreated();
        } else {
            alert(res.error || "Failed to create playlist");
        }
    };

    return (
        <form
            onSubmit={handleCreate}
            className="bg-white border-4 border-dashed border-gray-300 p-4 md:p-6 flex flex-col items-center justify-center text-center hover:border-black hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_black] group aspect-square"
        >
            <div className="mb-4">
                {isCreating ? (
                    <Loader2 size={48} className="text-black animate-spin" />
                ) : (
                    <PlusCircle size={48} className="text-gray-400 group-hover:text-black transition-colors" />
                )}
            </div>

            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Playlist Name"
                className="w-full text-center border-b-2 border-gray-300 focus:border-black outline-none bg-transparent font-bold uppercase text-sm md:text-base mb-2 placeholder:text-gray-400 placeholder:normal-case"
                disabled={isCreating}
            />

            <button
                type="submit"
                disabled={!name.trim() || isCreating}
                className="text-xs font-bold uppercase text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
            >
                Create
            </button>
        </form>
    );
}
