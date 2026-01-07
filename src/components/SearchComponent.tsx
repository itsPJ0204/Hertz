
"use client";

import { Search, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import { useRouter } from "next/navigation";

interface SearchResult {
    id: string;
    name: string;
    artist: string;
    genre: string;
    image: string;
    audio: string;
    duration?: number;
}

export function SearchComponent() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounce ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { play } = usePlayer();
    const router = useRouter();

    useEffect(() => {
        // Handle click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (term: string) => {
        setQuery(term);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (term.trim().length === 0) {
            setResults([]);
            setLoading(false);
            setShowDropdown(false);
            return;
        }

        setLoading(true);
        setShowDropdown(true);

        timeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
                const data = await res.json();
                setResults(data.results || []);
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce
    };

    const handlePlay = (track: SearchResult) => {
        // Construct track object for player
        const playerTrack = {
            id: track.id,
            name: track.name,
            artist_name: track.artist,
            image: track.image,
            audio: track.audio,
            duration: track.duration || 180, // Fallback if API doesn't return duration
            shareurl: "",
            origin: "search",
            isLiked: false,
            musicinfo: { tags: { genres: [track.genre] } }
        };
        play(playerTrack);
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto mb-8 z-40">
            <div className="relative group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search songs, artists, or vibes..."
                    className="w-full bg-black/5 border-2 border-black/10 rounded-full py-4 pl-14 pr-6 text-lg font-bold placeholder:text-black/30 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black/40 group-focus-within:text-black transition-colors" size={24} />

                {loading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {showDropdown && (query.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0px_10px_40px_-10px_rgba(0,0,0,0.3)] border border-black/5 overflow-hidden max-h-[60vh] overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="py-2">
                            {results.map((track) => (
                                <div
                                    key={track.id}
                                    className="flex items-center gap-4 p-3 hover:bg-black/5 cursor-pointer transition-colors group"
                                    onClick={() => handlePlay(track)}
                                >
                                    <div className="relative w-12 h-12 shrink-0 rounded bg-gray-200 overflow-hidden">
                                        <img src={track.image} alt={track.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={20} className="text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{track.name}</div>
                                        <div className="text-sm text-gray-500 truncate">{track.artist}</div>
                                    </div>
                                    {track.genre && (
                                        <div className="text-xs font-bold uppercase tracking-wider bg-black/5 px-2 py-1 rounded text-black/60 shrink-0">
                                            {track.genre.split(',')[0]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div className="p-8 text-center text-gray-400 font-medium">
                                No results found for "{query}"
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
