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

                <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                    <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-purple-600 to-blue-600 border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_black] md:shadow-[8px_8px_0px_0px_black] flex items-center justify-center shrink-0">
                        <Heart className="text-white fill-white" size={60} />
                    </div>
                    <div>
                        <h4 className="font-black uppercase mb-1 md:mb-2 text-sm md:text-base">Playlist</h4>
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic mb-2 md:mb-4 leading-none">Liked Songs</h1>
                        <p className="font-bold opacity-60 text-sm md:text-base">{songs.length} tracks • You have great taste</p>
                    </div>
                </div>

                <div className="bg-white border-2 md:border-4 border-black p-0 md:p-4 shadow-[4px_4px_0px_0px_black] md:shadow-[8px_8px_0px_0px_black]">
                    <div className="flex items-center justify-between mb-4 md:mb-6 p-4 border-b-2 border-black/5">
                        <button
                            onClick={playAll}
                            className="bg-green-500 text-black border-2 border-black px-6 md:px-8 py-2 md:py-3 font-black text-sm md:text-xl uppercase hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 shadow-[2px_2px_0px_0px_black] md:shadow-[4px_4px_0px_0px_black]"
                        >
                            <Play className="fill-black w-4 h-4 md:w-6 md:h-6" /> Play All
                        </button>
                    </div>

                    <div className="space-y-0 md:space-y-2">
                        {songs.length === 0 ? (
                            <div className="text-center p-12 opacity-50 font-bold">
                                No liked songs yet. Go explore!
                            </div>
                        ) : (
                            songs.map((song, i) => (
                                <div key={song.id} className="group flex items-center gap-2 md:gap-4 p-2 md:p-4 hover:bg-gray-100 border-b border-gray-200 md:border-transparent md:hover:border-black transition-all cursor-pointer" onClick={() => playQueue(songs, i)}>
                                    <span className="hidden md:block font-black text-gray-400 w-8 text-center">{i + 1}</span>
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 border md:border-2 border-black flex-shrink-0 relative">
                                        {song.image ? (
                                            <img src={song.image} className="w-full h-full object-cover" />
                                        ) : (
                                            <Music className="absolute inset-0 m-auto opacity-20" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Play className="text-white fill-white" size={20} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black truncate text-sm md:text-base">{song.name}</h3>
                                        <p className="text-xs font-bold opacity-50 truncate">{song.artist_name}</p>
                                    </div>
                                    <div className="hidden md:block text-sm font-bold opacity-50 mr-4">
                                        {song.musicinfo.tags.genres[0] || 'Unknown'}
                                    </div>
                                    <div className="text-xs md:text-sm font-black font-mono opacity-60">
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
