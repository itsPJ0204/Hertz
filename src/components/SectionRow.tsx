
"use client";

import { Play, Heart, Share2 } from "lucide-react";
import { usePlayer } from "./player/PlayerContext";
import { toggleLike } from "@/actions/toggleLike";
import { useTransition, useState } from "react";

interface Track {
    id: string;
    name: string;
    artist_name: string;
    image: string;
    audio: string;
    duration: number;
    shareurl: string;
    origin?: 'jamendo' | 'local';
    musicinfo?: {
        tags: {
            genres: string[];
            instruments: string[];
            vartags: string[];
        };
    };
    isLiked?: boolean; // New prop
}

interface SectionRowProps {
    title: string;
    tracks: Track[];
}

function TrackCard({ track }: { track: Track }) {
    const { play } = usePlayer();
    const [isLiked, setIsLiked] = useState(!!track.isLiked);
    const [isPending, startTransition] = useTransition();

    const handleLike = () => {
        // Optimistic update
        const newState = !isLiked;
        setIsLiked(newState);

        startTransition(async () => {
            try {
                await toggleLike(track.id);
            } catch (e) {
                // Revert on failure
                setIsLiked(!newState);
                console.error("Like failed", e);
            }
        });
    };

    return (
        <div
            className="min-w-[200px] w-[200px] bg-white border-2 border-black flex-shrink-0 snap-center group hover:translate-y-[-4px] transition-transform shadow-[4px_4px_0px_0px_black]"
        >
            {/* Image */}
            <div className="relative aspect-square border-b-2 border-black overflow-hidden bg-gray-100">
                <img
                    src={track.image}
                    alt={track.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Play Overlay */}
                <button
                    onClick={() => {
                        play({
                            ...track,
                            musicinfo: track.musicinfo || { tags: { genres: ['Unknown'], instruments: [], vartags: [] } }
                        });
                    }}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                    <div className="bg-clay-primary border-2 border-black p-3 rounded-full shadow-[2px_2px_0px_0px_white] hover:scale-110 transition-transform">
                        <Play size={24} fill="black" />
                    </div>
                </button>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-bold text-sm truncate leading-tight mb-1" title={track.name}>{track.name}</h3>
                <p className="text-xs font-bold opacity-60 truncate">{track.artist_name}</p>

                <div className="mt-3 flex justify-between items-center z-10 relative">
                    <span className="text-[10px] font-mono border border-black/20 px-1 rounded">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                    {/* Mini Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className={`transition-colors hover:scale-110 active:scale-95 ${isLiked ? "text-red-500 fill-red-500" : "text-black hover:text-red-500"}`}
                        >
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SectionRow({ title, tracks }: SectionRowProps) {
    if (!tracks || tracks.length === 0) return null;

    return (
        <div className="mb-12">
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tight flex items-center gap-2">
                <span className="w-4 h-4 bg-clay-primary inline-block"></span>
                {title}
            </h2>

            <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory scrollbar-hide">
                {tracks.map((track) => (
                    <TrackCard key={track.id} track={track} />
                ))}
            </div>
        </div>
    );
}
