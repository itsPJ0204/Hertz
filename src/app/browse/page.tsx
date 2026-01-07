import { createClient } from "@/lib/supabase/server";
import { ListMusic, Play, Disc } from "lucide-react";
import Link from "next/link";
import { SidebarShell } from "@/components/SidebarShell"; // Import Layout Shell if needed or assume layout.tsx handles it

export default async function BrowsePage() {
    const supabase = await createClient();

    // 1. Fetch all genres and count them to form playlists
    // Since Supabase doesn't support easy GROUP BY in JS client without RPC,
    // we fetch metadata and aggregate manually (ok for MVP scale)
    const { data: songs } = await supabase.from('songs').select('genre, language');

    const genreCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    songs?.forEach((song: any) => {
        // Genres are comma separated
        const genres = (song.genre || "").split(",").map((g: string) => g.trim());
        genres.forEach((g: string) => {
            if (g) {
                const normalizedGenre = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
                genreCounts[normalizedGenre] = (genreCounts[normalizedGenre] || 0) + 1;
            }
        });

        if (song.language) {
            languageCounts[song.language] = (languageCounts[song.language] || 0) + 1;
        }
    });

    // Filter playlists with > 0 songs (or > 5 as per request, but 0/1 for dev visibility)
    const genrePlaylists = Object.entries(genreCounts).filter(([_, count]) => count >= 5);
    const languagePlaylists = Object.entries(languageCounts).filter(([_, count]) => count > 0);

    return (
        <div className="min-h-screen bg-clay-bg p-8 text-black">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-black uppercase mb-8 border-b-4 border-black pb-4 flex items-center gap-3">
                    <Disc size={40} /> Discovery
                </h1>

                {/* Genres */}
                <section className="mb-12">
                    <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
                        <ListMusic /> Vibe Playlists
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {genrePlaylists.map(([genre, count]) => (
                            <Link
                                key={genre}
                                href={`/playlist/${encodeURIComponent(genre)}?type=genre`}
                                className="group block"
                            >
                                <div className="bg-white border-4 border-black aspect-square flex flex-col items-center justify-center p-6 shadow-[8px_8px_0px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[4px_4px_0px_0px_black] transition-all relative overflow-hidden">
                                    {/* Decorative BG */}
                                    <div className="absolute inset-0 bg-clay-primary opacity-0 group-hover:opacity-10 transition-opacity" />

                                    <h3 className="text-2xl font-black uppercase text-center relative z-10 break-words w-full">{genre}</h3>
                                    <p className="font-bold opacity-50 relative z-10">{count} Tracks</p>

                                    <div className="absolute bottom-4 right-4 bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 transition-transform transform translate-y-2 group-hover:translate-y-0">
                                        <Play size={20} fill="white" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {genrePlaylists.length === 0 && <p className="opacity-50 font-bold">No vibe playlists yet. Start uploading!</p>}
                    </div>
                </section>

                {/* Languages */}
                <section>
                    <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
                        <Disc /> Regional Mixes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {languagePlaylists.map(([lang, count]) => (
                            <Link
                                key={lang}
                                href={`/playlist/${encodeURIComponent(lang)}?type=language`}
                                className="group block"
                            >
                                <div className="bg-clay-secondary border-4 border-black aspect-video flex flex-col items-center justify-center p-6 shadow-[8px_8px_0px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[4px_4px_0px_0px_black] transition-all relative overflow-hidden">
                                    <h3 className="text-xl font-black uppercase text-center text-white relative z-10">{lang} Hits</h3>
                                    <p className="font-bold text-white/70 relative z-10">{count} Tracks</p>
                                </div>
                            </Link>
                        ))}
                        {languagePlaylists.length === 0 && <p className="opacity-50 font-bold">No regional mixes yet.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
