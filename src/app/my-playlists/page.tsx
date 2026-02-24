import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Music } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePlaylistTileWrapper } from "./CreatePlaylistTileWrapper";

export default async function YourPlaylistsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch user playlists
    const { data: playlists, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Handle case where table might not exist yet
    if (error && error.code !== '42P01') {
        console.error("Error fetching playlists:", error);
    }

    const playlistItems = playlists || [];

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Discovery
                </Link>

                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black uppercase italic leading-none mb-4">Your Playlists</h1>
                    <p className="font-bold opacity-60 text-sm md:text-base">Manage and play your custom collections</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Create New Tile */}
                    <CreatePlaylistTileWrapper />

                    {/* Playlist Tiles */}
                    {playlistItems.map((playlist) => (
                        <Link
                            href={`/my-playlists/${playlist.id}`}
                            key={playlist.id}
                            className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_black] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_black] transition-all flex flex-col aspect-square group"
                        >
                            <div className="flex-1 bg-gray-100 border-2 border-black mb-3 overflow-hidden flex items-center justify-center relative">
                                {playlist.cover_url ? (
                                    <img src={playlist.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={playlist.name} />
                                ) : (
                                    <Music size={40} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold uppercase truncate text-sm md:text-base leading-tight mb-1">{playlist.name}</h3>
                                <p className="text-xs font-bold opacity-50 uppercase">Playlist</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
