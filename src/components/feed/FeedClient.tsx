"use client";

import { useState } from "react";
import { ConnectionCard } from "./ConnectionCard";
import { MatchedUser } from "@/lib/matching";

interface FeedClientProps {
    matches: MatchedUser[];
}

export function FeedClient({ matches }: FeedClientProps) {
    const [filter, setFilter] = useState<'all' | 'spotify'>('all');

    // Filter Logic
    const displayedMatches = matches.filter(m => {
        if (filter === 'spotify') {
            // "Spotify Soulmates" are those with a high Spotify-specific score (>= 80%)
            // We use 0.8 as the threshold.
            return (m.spotifyScore && m.spotifyScore >= 80);
        }
        return true;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-4xl font-bold uppercase italic">
                    {filter === 'spotify' ? 'Spotify Soulmates' : 'Find Your Frequency'}
                </h1>

                <div className="flex border-2 border-black bg-white p-1 gap-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 font-black uppercase text-sm transition-all ${filter === 'all' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >
                        All Vibes
                    </button>
                    <button
                        onClick={() => setFilter('spotify')}
                        className={`px-4 py-2 font-black uppercase text-sm transition-all flex items-center gap-2 ${filter === 'spotify' ? 'bg-[#1DB954] text-white' : 'hover:bg-green-50'}`}
                    >
                        <span>Spotify Only</span>
                        <span className="bg-black text-white text-[10px] px-1.5 rounded-full">80%+</span>
                    </button>
                </div>
            </div>

            {displayedMatches.length === 0 ? (
                <div className="p-12 border-2 border-black bg-white text-center shadow-[4px_4px_0px_0px_#000]">
                    <h3 className="text-2xl font-black mb-2 uppercase">No Matches Found</h3>
                    <p className="font-medium opacity-60">
                        {filter === 'spotify'
                            ? "No one matches your Spotify taste closely enough yet. Keep vibing!"
                            : "Listen to more music to build your vibe profile!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayedMatches.map(m => (
                        <ConnectionCard
                            key={m.id}
                            {...m}
                            matchScore={filter === 'spotify' ? (m.spotifyScore || m.matchScore) : m.matchScore}
                            initialStatus={'none'} // Already filtered out connected/pending
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
