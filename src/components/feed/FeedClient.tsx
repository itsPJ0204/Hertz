"use client";

import { useState } from "react";
import { ConnectionCard } from "./ConnectionCard";
import { MatchedUser } from "@/lib/matching";

interface FeedClientProps {
    matches: MatchedUser[];
    currentUserId: string;
}

export function FeedClient({ matches, currentUserId }: FeedClientProps) {
    // Matches are already sorted by the backend algorithm
    const displayedMatches = matches;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-4xl font-bold uppercase italic">
                    Your Frequencies
                </h1>
            </div>

            {displayedMatches.length === 0 ? (
                <div className="p-12 border-2 border-black bg-white text-center shadow-[4px_4px_0px_0px_#000]">
                    <h3 className="text-2xl font-black mb-2 uppercase">No Matches Found</h3>
                    <p className="font-medium opacity-60">
                        Listen to more music to build your vibe profile!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayedMatches.map(m => (
                        <ConnectionCard
                            key={m.id}
                            {...m}
                            initialStatus={'none'} // Already filtered out connected/pending
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
