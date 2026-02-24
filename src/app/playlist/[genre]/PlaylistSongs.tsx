"use client";

import { usePlayer } from "@/components/player/PlayerContext";
import { SongActionMenu } from "@/components/SongActionMenu";
import { Play } from "lucide-react";

export function PlaylistSongs({ songs }: { songs: any[] }) {
    const { playQueue } = usePlayer();

    // Convert db songs to JamendoTrack format
    const dbSongToFormat = (track: any) => ({
        id: track.external_id || track.id,
        name: track.title,
        artist_name: track.artist,
        audio: track.url,
        image: track.cover_url || '',
        duration: track.duration || 180,
        musicinfo: { tags: { genres: [track.genre || 'Pop'] } }
    });

    const handlePlaySong = (index: number) => {
        const tracks = songs.map(dbSongToFormat);
        playQueue(tracks, index);
    };

    if (!songs || songs.length === 0) {
        return (
            <div className="text-center py-12 opacity-50 font-bold uppercase">
                No songs found in this playlist.
            </div>
        );
    }

    return (
        <div className="space-y-2 md:space-y-4 pb-12">
            {songs.map((song, i) => {
                const formattedTrack = dbSongToFormat(song);
                return (
                    <div
                        key={song.id}
                        className="bg-white border-2 border-black p-2 md:p-4 flex items-center gap-2 md:gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => handlePlaySong(i)}
                    >
                        <div className="hidden md:flex w-8 font-black opacity-30 justify-end group-hover:hidden">
                            {i + 1}
                        </div>
                        <div className="hidden md:flex w-8 justify-end text-black hidden group-hover:flex">
                            <Play size={16} fill="currentColor" />
                        </div>

                        <img src={song.cover_url || "https://placehold.co/40"} className="w-10 h-10 md:w-12 md:h-12 border border-black object-cover shrink-0" alt={song.title} />

                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-bold uppercase truncate text-sm md:text-base group-hover:underline">{song.title}</h3>
                            <p className="text-xs font-bold opacity-50 uppercase truncate">{song.artist}</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="opacity-50 hover:opacity-100 transition-opacity">
                                <SongActionMenu track={formattedTrack} />
                            </div>
                            <div className="text-xs font-mono font-bold opacity-50 w-12 text-right">
                                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
