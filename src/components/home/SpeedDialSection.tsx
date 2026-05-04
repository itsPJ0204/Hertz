"use client";

import { Play } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import { SongActionMenu } from "@/components/SongActionMenu";
import { useLongPress } from "@/hooks/useLongPress";

interface Track {
    id: string;
    name: string;
    artist_name: string;
    image: string;
    audio: string;
    duration: number;
    shareurl: string;
    origin?: string;
    musicinfo?: any;
    isLiked?: boolean;
}

interface SpeedDialSectionProps {
    title: string;
    tracks: Track[];
}

function SpeedDialCard({ track }: { track: Track }) {
    const { play } = usePlayer();

    const handlePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        play({
            ...track,
            musicinfo: track.musicinfo || { tags: { genres: ['Unknown'], instruments: [], vartags: [] } }
        });
    };

    const longPressHandlers = useLongPress(() => {
        document.getElementById(`menu-btn-${track.id}`)?.click();
    }, handlePlay);

    return (
        <div {...longPressHandlers} className="relative w-[120px] h-[120px] md:w-full md:aspect-square flex-shrink-0 group cursor-pointer border-2 border-black shadow-[2px_2px_0px_0px_black] hover:shadow-[4px_4px_0px_0px_black] transition-all hover:-translate-y-1 overflow-hidden bg-gray-900 rounded-sm">
            <img src={track.image} alt={track.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 pointer-events-none" />
            
            {/* Gradient Overlay for Text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

            {/* Text Content */}
            <div className="absolute bottom-0 left-0 w-full p-2 pointer-events-none">
                <h3 className="text-white font-black text-xs md:text-sm leading-tight line-clamp-2 uppercase italic drop-shadow-md">
                    {track.name}
                </h3>
            </div>

            {/* Menu Button - Hidden on mobile unless hovered on desktop */}
            <div className="absolute top-1 right-1 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity hidden md:block">
                <SongActionMenu track={track as any} />
            </div>

            {/* Play Overlay */}
            <button
                onClick={handlePlay}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
            >
                <div className="bg-clay-primary border-2 border-black p-2 rounded-full shadow-[2px_2px_0px_0px_white] hover:scale-110 transition-transform">
                    <Play size={16} fill="black" />
                </div>
            </button>
        </div>
    );
}

export function SpeedDialSection({ title, tracks }: SpeedDialSectionProps) {
    if (!tracks || tracks.length === 0) return null;

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight flex items-center gap-2 px-4 md:px-0">
                {title}
            </h2>

            <div className="overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-4 md:px-0">
                {/* 3 Rows Grid on mobile, Standard wrapping grid on desktop */}
                <div className="grid grid-rows-3 grid-flow-col md:grid-rows-none md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:grid-flow-row gap-3 md:gap-4 w-max md:w-full pr-8 md:pr-0">
                    {tracks.map((track) => (
                        <div key={track.id} className="snap-start">
                            <SpeedDialCard track={track} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
