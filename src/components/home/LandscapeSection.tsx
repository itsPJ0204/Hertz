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

interface LandscapeSectionProps {
    title: string;
    tracks: Track[];
}

function LandscapeCard({ track }: { track: Track }) {
    const { play } = usePlayer();

    const handlePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        play({
            ...track,
            musicinfo: track.musicinfo || { tags: { genres: ['Unknown'], instruments: [], vartags: [] } }
        });
    };

    const longPressHandlers = useLongPress(() => {
        document.getElementById(`menu-btn-landscape-${track.id}`)?.click();
    }, handlePlay);

    return (
        <div 
            {...longPressHandlers}
            className="w-[280px] md:w-[400px] flex-shrink-0 snap-center group cursor-pointer relative"
        >
            {/* 16:9 Aspect Ratio Container */}
            <div className="relative w-full aspect-video border-2 border-black bg-gray-900 shadow-[4px_4px_0px_0px_black] group-hover:shadow-[2px_2px_0px_0px_black] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all overflow-hidden mb-3">
                {/* Image cropped to cover 16:9 */}
                <img 
                    src={track.image} 
                    alt={track.name} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <div className="bg-clay-primary border-2 border-black p-3 rounded-full shadow-[2px_2px_0px_0px_white] scale-90 group-hover:scale-100 transition-transform">
                        <Play size={24} fill="black" />
                    </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/20">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                </div>
            </div>

            {/* Text Below */}
            <div className="px-1 flex justify-between items-start">
                <div className="min-w-0 pr-2">
                    <h3 className="font-black text-sm md:text-base uppercase italic truncate leading-tight mb-1" title={track.name}>
                        {track.name}
                    </h3>
                    <p className="text-xs md:text-sm font-bold opacity-60 truncate">
                        {track.artist_name}
                    </p>
                </div>
                {/* Menu Button - Hidden on mobile unless hovered on desktop */}
                <div className="flex-shrink-0 -mt-1 opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none md:pointer-events-auto">
                    <SongActionMenu track={track as any} menuId={`menu-btn-landscape-${track.id}`} />
                </div>
            </div>
        </div>
    );
}

export function LandscapeSection({ title, tracks }: LandscapeSectionProps) {
    if (!tracks || tracks.length === 0) return null;

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tight flex items-center gap-2 px-4 md:px-0">
                {title}
            </h2>

            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x snap-mandatory scrollbar-hide pr-8 px-4 md:px-0">
                {tracks.map((track) => (
                    <LandscapeCard key={track.id} track={track} />
                ))}
            </div>
        </div>
    );
}
