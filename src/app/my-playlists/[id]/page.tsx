import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Play, Music, Trash2 } from "lucide-react";
import Link from "next/link";
import { PlaylistSongs } from "@/app/playlist/[genre]/PlaylistSongs";
import { PlaylistCover } from "@/app/playlist/[genre]/PlaylistCover";
import { PlaylistAddSongs } from "./PlaylistAddSongs";
import { redirect } from "next/navigation";

export default async function UserPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch playlist details
    const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .single();

    if (playlistError || !playlist) {
        return (
            <div className="min-h-screen bg-clay-bg flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black uppercase mb-4">Playlist Not Found</h1>
                    <Link href="/" className="underline font-bold uppercase">Return Home</Link>
                </div>
            </div>
        );
    }

    // Ensure user owns this or make it public if we had privacy controls.
    if (playlist.user_id !== user.id) {
        return (
            <div className="min-h-screen bg-clay-bg flex items-center justify-center p-8">
                <div className="text-center text-red-500">
                    <h1 className="text-4xl font-black uppercase mb-4">Unauthorized</h1>
                    <Link href="/" className="underline font-bold uppercase text-black">Return Home</Link>
                </div>
            </div>
        );
    }

    // Fetch songs in this playlist using junction table
    const { data: pivotData } = await supabase
        .from('playlist_songs')
        .select(`
            song_id,
            added_at,
            songs (*)
        `)
        .eq('playlist_id', id)
        .order('added_at', { ascending: false });

    const songs = pivotData?.map((p: any) => p.songs).filter(Boolean) || [];

    // We need Jamendo external IDs or our internal IDs to track what's added. Both are safe.
    const currentSongIds = songs.map((s: any) => s.external_id || s.id);

    // Fallback cover if needed
    const heroImage = playlist.cover_url || `https://source.unsplash.com/1000x1000/?music,abstract,${encodeURIComponent(playlist.name)}`;

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Discovery
                </Link>

                <div className="bg-white border-2 md:border-4 border-black p-0 md:p-8 shadow-[4px_4px_0px_0px_black] md:shadow-[8px_8px_0px_0px_black] mb-8 relative">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 p-6 md:p-0">
                        <PlaylistCover src={heroImage} alt={playlist.name} />
                        <div className="flex-1 text-center md:text-left min-w-0">
                            <span className="font-bold uppercase tracking-widest opacity-50 block mb-2 text-xs md:text-sm">Your Playlist</span>
                            <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-none mb-4 break-words">{playlist.name}</h1>
                            <p className="font-bold opacity-60 mb-6 text-sm md:text-base">{songs?.length || 0} Songs • Created by You</p>
                        </div>
                    </div>
                </div>

                {/* Song List */}
                <PlaylistSongs songs={songs} />

                {/* Inline Search and Add */}
                <PlaylistAddSongs playlistId={id} currentSongIds={currentSongIds} />

            </div>
        </div>
    );
}
