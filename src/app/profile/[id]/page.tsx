import { createClient } from "@/lib/supabase/server";
import { User, ArrowLeft, Play, MessageCircle, Clock, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfileClient } from "./PublicProfileClient";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    // If it's their own profile, redirect to their edit profile page
    if (user && user.id === id) {
        return (
            <div className="min-h-screen bg-clay-bg flex items-center justify-center font-black">
                <meta httpEquiv="refresh" content={`0; url=/profile`} />
            </div>
        );
    }

    // Fetch Target Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (!profile) {
        notFound();
    }

    // Fetch Stats
    const [likesRes, matchesRes, mProfileRes, songsRes] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', id),
        supabase.from('connections')
            .select('*', { count: 'exact', head: true })
            .or(`user_a.eq.${id},user_b.eq.${id}`)
            .eq('status', 'connected'),
        supabase.from('user_music_profiles').select('*').eq('user_id', id).single(),
        supabase.from('songs').select('*').eq('uploader_id', id).order('created_at', { ascending: false })
    ]);

    const stats = {
        likes: likesRes.count || 0,
        matches: matchesRes.count || 0
    };

    const musicProfile = mProfileRes.data;
    const uploadedSongs = songsRes.data || [];

    // Check connection status if logged in
    let connectionStatus = 'none';
    if (user) {
        const { data: connection } = await supabase
            .from('connections')
            .select('status')
            .or(`and(user_a.eq.${user.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${user.id})`)
            .single();

        if (connection) {
            connectionStatus = connection.status;
        }
    }

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/feed" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Feed
                </Link>

                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_black] relative">
                    <div className="absolute top-0 right-0 p-4">
                        <span className="text-xs font-black uppercase border-2 border-black px-2 py-1 bg-yellow-300">Member</span>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-32 h-32 rounded-full border-4 border-black bg-clay-secondary overflow-hidden mb-4 flex items-center justify-center">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="opacity-50" />
                            )}
                        </div>

                        <h1 className="text-3xl font-black uppercase italic">{profile.full_name || "Anonymous Vibe"}</h1>
                        
                        {/* Connection Button */}
                        {user && (
                            <div className="mt-6 w-full max-w-xs">
                                <PublicProfileClient 
                                    targetId={id} 
                                    currentUserId={user.id} 
                                    initialStatus={connectionStatus as any} 
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="border-t-2 border-black pt-4">
                            <h3 className="font-black uppercase mb-2">Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-clay-bg p-4 border-2 border-black text-center">
                                    <span className="block text-2xl font-black">{stats.likes}</span>
                                    <span className="text-xs font-bold uppercase opacity-60">Tracks Vibed</span>
                                </div>
                                <div className="bg-clay-bg p-4 border-2 border-black text-center">
                                    <span className="block text-2xl font-black">{stats.matches}</span>
                                    <span className="text-xs font-bold uppercase opacity-60">Frequencies</span>
                                </div>
                            </div>

                            {/* SPOTIFY SECTION */}
                            <div className="border-t-2 border-black pt-8">
                                <h3 className="font-black uppercase text-xl flex items-center gap-2 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                    Spotify Taste
                                </h3>

                                {musicProfile?.is_spotify_linked ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-clay-bg p-4 border-2 border-black">
                                            <h4 className="font-black uppercase mb-2 text-sm opacity-60">Top Artists</h4>
                                            <ul className="space-y-1">
                                                {(musicProfile.top_artists || []).slice(0, 5).map((a: any, i: number) => (
                                                    <li key={i} className="text-sm font-bold truncate">{i + 1}. {a.name}</li>
                                                ))}
                                                {(!musicProfile.top_artists || musicProfile.top_artists.length === 0) && (
                                                    <li className="text-sm font-bold opacity-50">No artists found</li>
                                                )}
                                            </ul>
                                        </div>
                                        <div className="bg-clay-bg p-4 border-2 border-black">
                                            <h4 className="font-black uppercase mb-2 text-sm opacity-60">Top Tracks</h4>
                                            <ul className="space-y-1">
                                                {(musicProfile.saved_tracks || musicProfile.recently_played || []).slice(0, 5).map((t: any, i: number) => (
                                                    <li key={i} className="text-sm font-bold truncate">{i + 1}. {t.name}</li>
                                                ))}
                                                {(!(musicProfile.saved_tracks || musicProfile.recently_played)?.length) && (
                                                    <li className="text-sm font-bold opacity-50">No tracks found</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="font-bold opacity-50 italic">Spotify is not linked.</p>
                                )}
                            </div>

                            {/* UPLOADS SECTION */}
                            <div className="border-t-2 border-black pt-8">
                                <h3 className="font-black uppercase mb-4 text-xl flex items-center justify-between">
                                    Uploads
                                </h3>

                                {uploadedSongs.length === 0 ? (
                                    <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-300">
                                        <p className="font-bold opacity-50">No tracks uploaded yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {uploadedSongs.map(song => (
                                            <div key={song.id} className="bg-white border-2 border-black p-4 flex items-center gap-4 hover:shadow-[4px_4px_0px_0px_black] transition-shadow duration-200">
                                                <div className="w-16 h-16 bg-gray-200 border-2 border-black flex-shrink-0 relative overflow-hidden group cursor-pointer">
                                                    <img src={song.cover_url || "https://placehold.co/100"} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black truncate">{song.title}</h4>
                                                    <p className="text-sm font-bold opacity-50 truncate">{song.artist}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] font-black uppercase bg-yellow-300 border border-black px-1">{song.genre || 'Unknown'}</span>
                                                        <span className="text-[10px] font-black uppercase bg-gray-200 border border-black px-1">{Math.floor((song.duration || 0) / 60)}:{(song.duration || 0) % 60 < 10 ? '0' : ''}{(song.duration || 0) % 60}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
