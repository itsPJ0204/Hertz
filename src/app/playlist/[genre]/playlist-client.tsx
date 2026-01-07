"use client";

import { usePlayer } from "@/components/player/PlayerContext";
import { Play } from "lucide-react";

export function PlaylistClient({ songs }: { songs: any[] }) {
    const { playQueue } = usePlayer();

    const handlePlay = () => {
        // Convert DB songs to JamendoTrack format
        const tracks = songs.map(track => ({
            id: track.external_id || track.id,
            name: track.title,
            artist_name: track.artist,
            audio: track.url,
            image: track.cover_url || '',
            duration: track.duration || 180,
            musicinfo: { tags: { genres: [track.genre || 'Pop'] } }
        }));
        playQueue(tracks, 0);
    };

    return (
        <button
            onClick={handlePlay}
            className="bg-black text-white px-8 py-3 font-black uppercase flex items-center gap-3 hover:translate-y-1 active:translate-y-2 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
        >
            <Play fill="white" />
            Play All
        </button>
    );
}
