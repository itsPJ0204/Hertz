"use client";

import { useEffect, useState } from "react";
import { getLikedSongs } from "@/actions/getLikedSongs";
import { usePlayer } from "@/components/player/PlayerContext";
import { Heart, Play, Music, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LikedSongsPage() {
    const [songs, setSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { play, playQueue } = usePlayer(); // Added playQueue

    useEffect(() => {
        async function load() {
            const liked = await getLikedSongs();
            // Map DB songs to JamendoTrack format
            const mapped = liked.map((s: any) => ({
                id: s.id,
                name: s.title,
                artist_name: s.artist,
                audio: s.url,
                image: s.cover_url,
                duration: s.duration,
                musicinfo: { tags: { genres: [s.genre || 'Unknown'] } }
            }));
            setSongs(mapped || []);
            setLoading(false);
        }
        load();
    }, []);

    const playAll = () => {
        if (songs.length > 0) {
            playQueue(songs, 0); // Use playQueue to enable next/prev
        }
    };

    if (loading) return <div className="min-h-screen bg-clay-bg flex items-center justify-center font-black animate-pulse">LOADING LIKES...</div>;

    return (
        <div className="min-h-screen bg-clay-bg p-8 pb-32">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Home
                </Link>

                <div className="flex items-end gap-6 mb-8">
                    <div className="w-52 h-52 bg-gradient-to-br from-purple-600 to-blue-600 border-4 border-black shadow-[8px_8px_0px_0px_black] flex items-center justify-center">
                        <Heart className="text-white fill-white" size={80} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase mb-2">Playlist</h4>
                        <h1 className="text-6xl font-black uppercase italic mb-4">Liked Songs</h1>
                        <p className="font-bold opacity-60">{songs.length} tracks • You have great taste</p>
                    </div>
                </div>

                <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_black]">
                    <div className="flex items-center justify-between mb-6 p-4">
                        <button
                            onClick={playAll}
                            className="bg-green-500 text-black border-2 border-black px-8 py-3 font-black text-xl uppercase hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 shadow-[4px_4px_0px_0px_black]"
                        >
                            <Play className="fill-black" /> Play All
                        </button>
                    </div>

                    <div className="space-y-2">
                        {songs.length === 0 ? (
                            <div className="text-center p-12 opacity-50 font-bold">
                                No liked songs yet. Go explore!
                            </div>
                        ) : (
                            songs.map((song, i) => (
                                <div key={song.id} className="group flex items-center gap-4 p-4 hover:bg-gray-100 border-b-2 border-transparent hover:border-black transition-all cursor-pointer" onClick={() => playQueue(songs, i)}>
                                    <span className="font-black text-gray-400 w-8">{i + 1}</span>
                                    <div className="w-12 h-12 bg-gray-200 border-2 border-black flex-shrink-0 relative">
                                        {song.image ? (
                                            <img src={song.image} className="w-full h-full object-cover" />
                                        ) : (
                                            <Music className="absolute inset-0 m-auto opacity-20" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Play className="text-white fill-white" size={20} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black truncate">{song.name}</h3>
                                        <p className="text-sm font-bold opacity-50">{song.artist_name}</p>
                                    </div>
                                    <div className="text-sm font-bold opacity-50 mr-4">
                                        {song.musicinfo.tags.genres[0] || 'Unknown'}
                                    </div>
                                    <div className="text-sm font-black font-mono">
                                        {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
