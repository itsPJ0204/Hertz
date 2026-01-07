"use client";

import { JamendoTrack } from "@/lib/jamendo";
import { usePlayer } from "./player/PlayerContext";
import { Play } from "lucide-react";

export function SongGrid({ tracks }: { tracks: JamendoTrack[] }) {
    const { play } = usePlayer();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
                <div
                    key={track.id}
                    className="group relative bg-[#F4F1EA] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 transition-all"
                >
                    <div className="aspect-square bg-black/5 border-2 border-black mb-4 relative overflow-hidden">
                        <img src={track.image} alt={track.name} className="w-full h-full object-cover" />

                        {/* Overlay Play Button */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => play(track)}
                                className="bg-clay-primary text-white p-4 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_white] hover:scale-110 active:scale-95 transition-transform"
                            >
                                <Play fill="currentColor" />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{track.name}</h3>
                            <p className="text-sm opacity-70 mt-1">{track.artist_name}</p>
                        </div>
                        <div className="text-xs font-mono border border-black px-1.5 py-0.5 rounded-sm">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        {track.musicinfo.tags.genres.map(g => (
                            <span key={g} className="text-xs border border-black px-2 py-0.5 rounded-full bg-white">{g}</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
