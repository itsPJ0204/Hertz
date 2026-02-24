import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Play, Music } from "lucide-react";
import Link from "next/link";
import { PlaylistClient } from "./playlist-client"; // Client component for player interaction
import { PlaylistCover } from "./PlaylistCover";
import { PlaylistSongs } from "./PlaylistSongs";

export default async function PlaylistPage({ params, searchParams }: { params: Promise<{ genre: string }>, searchParams: Promise<{ type?: string }> }) {
    const supabase = await createClient();
    const { genre } = await params;
    const { type: searchType } = await searchParams;
    const decodedName = decodeURIComponent(genre);
    const type = searchType || 'genre'; // 'genre' or 'language'

    let query = supabase.from('songs').select('*');

    if (type === 'language') {
        query = query.eq('language', decodedName);
    } else {
        // Genre search using partial match for comma-separated list - use ILIKE for case-insensitive
        // We match %Genre% to find it anywhere in the CSV string
        query = query.ilike('genre', `%${decodedName}%`);
    }

    const { data: songsData } = await query;
    // Client-side filter to be double sure if ILIKE is too broad (optional but safe)
    // Actually ILIKE is fine for MVP.
    const songs: any[] = songsData || [];

    // Dynamic Cover Art Calculation
    // Priority: First song's cover -> Unsplash based on genre -> Default placeholder
    let heroImage = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop"; // Default fallback

    if (songs.length > 0) {
        // Try to find a song with a valid cover
        const validCoverSong = songs.find((s: any) => s.cover_url && s.cover_url.startsWith('http'));
        if (validCoverSong) {
            heroImage = validCoverSong.cover_url;
        } else {
            // Fallback to genre-seeded unsplash
            heroImage = `https://source.unsplash.com/1000x1000/?${encodeURIComponent(decodedName)},music,abstract`;
        }
    }

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Discovery
                </Link>

                <div className="bg-white border-2 md:border-4 border-black p-0 md:p-8 shadow-[4px_4px_0px_0px_black] md:shadow-[8px_8px_0px_0px_black] mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 p-6 md:p-0">
                        <PlaylistCover src={heroImage} alt={decodedName} />
                        <div className="flex-1 text-center md:text-left min-w-0">
                            <span className="font-bold uppercase tracking-widest opacity-50 block mb-2 text-xs md:text-sm">{type === 'language' ? 'Regional Mix' : 'Vibe Playlist'}</span>
                            <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-none mb-4 break-words">{decodedName}</h1>
                            <p className="font-bold opacity-60 mb-6 text-sm md:text-base">{songs?.length || 0} Songs • Curated for you</p>

                            {/* Play Button (Client Component) */}
                            {songs && songs.length > 0 && (
                                <PlaylistClient songs={songs} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Song List */}
                <PlaylistSongs songs={songs} />
            </div>
        </div>
    );
}
