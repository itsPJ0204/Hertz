"use client";

import { useState, useEffect as import_react_useEffect } from "react";
import { Search, Loader2, Plus, Check } from "lucide-react";
import { JamendoTrack } from "@/lib/jamendo";
import { addSongToPlaylist } from "@/actions/playlists";

export function PlaylistAddSongs({ playlistId, currentSongIds }: { playlistId: string, currentSongIds: string[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<JamendoTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set(currentSongIds));

    // Fetch default list when opening
    import_react_useEffect(() => {
        if (isOpen && query === "" && results.length === 0) {
            handleSearch(null);
        }
    }, [isOpen]);

    const handleSearch = async (e: React.FormEvent | null) => {
        if (e) e.preventDefault();

        setIsSearching(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.results) {
                setResults(data.results);
            }
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async (track: JamendoTrack) => {
        const res = await addSongToPlaylist(playlistId, track);
        if (res.success) {
            setAddedIds(prev => new Set(prev).add(track.id));
        } else {
            alert(res.error || "Failed to add song.");
        }
    };

    if (!isOpen) {
        return (
            <div className="mt-8 border-t-4 border-black pt-8">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full bg-white border-4 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center hover:border-black hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_black] group"
                >
                    <Search size={32} className="text-gray-400 group-hover:text-black mb-2 transition-colors" />
                    <span className="font-bold uppercase text-gray-500 group-hover:text-black">Let's find some songs for your playlist</span>
                </button>
            </div>
        );
    }

    return (
        <div className="mt-8 border-t-4 border-black pt-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black uppercase italic mb-4">Add Songs</h2>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search for songs or artists..."
                        className="w-full border-4 border-black p-4 pl-12 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow text-lg"
                        autoFocus
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={24} />
                </div>
                <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-clay-primary text-white border-4 border-black px-8 font-black uppercase text-xl shadow-[4px_4px_0px_0px_black] hover:translate-y-1 hover:shadow-none active:translate-y-2 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_black]"
                >
                    {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
                </button>
            </form>

            {!isSearching && results.length === 0 && (
                <div className="text-center py-8 opacity-50 font-bold uppercase">No results found.</div>
            )}

            {results.length > 0 && (
                <div className="bg-white border-2 border-black space-y-2 p-2 max-h-96 overflow-y-auto">
                    {results.map((track) => {
                        // Cast to any since JamendoTrack might not strict-type external_id, but the search API might return it
                        const trackData: any = track;
                        const isAdded = addedIds.has(trackData.id) || (trackData.external_id && addedIds.has(trackData.external_id));
                        return (
                            <div key={track.id} className="flex items-center gap-4 p-2 hover:bg-gray-100 border border-transparent hover:border-gray-200">
                                <img src={track.image || "https://placehold.co/40"} alt={track.name} className="w-12 h-12 object-cover border border-black" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{track.name}</h4>
                                    <p className="text-sm opacity-60 truncate">{track.artist_name}</p>
                                </div>
                                <button
                                    onClick={() => handleAdd(track)}
                                    disabled={isAdded}
                                    className={`px-4 py-2 border-2 border-black font-bold text-sm flex items-center gap-2 transition-colors ${isAdded ? 'bg-green-100 text-green-700 border-green-700 opacity-50' : 'hover:bg-clay-secondary'}`}
                                >
                                    {isAdded ? (
                                        <><Check size={16} /> Added</>
                                    ) : (
                                        <><Plus size={16} /> Add</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                onClick={() => setIsOpen(false)}
                className="mt-4 text-sm font-bold uppercase opacity-50 hover:opacity-100 underline"
            >
                Close Search
            </button>
        </div>
    );
}
