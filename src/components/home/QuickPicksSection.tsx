"use client";

import { Play, MoreVertical } from "lucide-react";
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

interface QuickPicksSectionProps {
    title: string;
    tracks: Track[];
}

function QuickPickListItem({ track }: { track: Track }) {
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
        <div 
            {...longPressHandlers}
            className="group flex items-center justify-between w-[280px] md:w-[360px] p-2 hover:bg-black/5 rounded cursor-pointer transition-colors border-b border-black/5 last:border-0"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 flex-shrink-0 bg-gray-200 border border-black shadow-[2px_2px_0px_0px_black] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all overflow-hidden">
                    <img src={track.image} alt={track.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={16} fill="white" className="text-white" />
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm truncate uppercase italic">{track.name}</h4>
                    <p className="text-xs font-bold opacity-60 truncate">
                        {track.artist_name} • {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </p>
                </div>
            </div>
            
            <div className="flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-2 hidden md:block" onClick={e => e.stopPropagation()}>
                <SongActionMenu track={track as any} />
            </div>
        </div>
    );
}

export function QuickPicksSection({ title, tracks }: QuickPicksSectionProps) {
    const { playQueue, play } = usePlayer();

    if (!tracks || tracks.length === 0) return null;

    const handlePlayAll = () => {
        const fullQueue = tracks.map(track => ({
            ...track,
            musicinfo: track.musicinfo || { tags: { genres: ['Unknown'], instruments: [], vartags: [] } }
        }));
        playQueue(fullQueue, 0);
    };

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    {title}
                </h2>
                <button 
                    onClick={handlePlayAll}
                    className="border-2 border-black px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_black] hover:shadow-[4px_4px_0px_0px_black] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all bg-clay-primary text-white flex-shrink-0"
                >
                    Play All
                </button>
            </div>

            <div className="overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-4 md:px-0">
                {/* 4 Rows Grid, auto flow column */}
                <div className="grid grid-rows-4 grid-flow-col gap-x-6 gap-y-1 w-max pr-8">
                    {tracks.map((track) => (
                        <div key={track.id} className="snap-start">
                            <QuickPickListItem track={track} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
