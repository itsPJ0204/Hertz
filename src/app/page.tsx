
import { SectionRow } from "@/components/SectionRow";
import { Navigation } from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecommendations } from "@/lib/recommendations";

import { SearchComponent } from "@/components/SearchComponent";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 0. Fetch User Likes (for "isLiked" status)
  let userLikes = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from('likes')
      .select('song_id')
      .eq('user_id', user.id);
    if (likes) {
      likes.forEach((l: any) => userLikes.add(l.song_id));
    }
  }

  // 1. Fetch Fresh Drops (Latest Uploads)
  const { data: freshSongs } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // 2. Fetch History (Jump Back In)
  let historyTracks: any[] = [];
  if (user) {
    const { data: historyData } = await supabase
      .from('listening_history')
      .select('song_id, songs(*)')
      .eq('user_id', user.id)
      .order('listened_at', { ascending: false })
      .limit(30);

    const seen = new Set();
    historyTracks = (historyData || [])
      .map((h: any) => h.songs)
      .filter((s: any) => {
        if (!s || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .slice(0, 15);
  }

  // 3. Fetch Liked Songs (Your Collection)
  let likedTracksRaw: any[] = [];
  if (user && userLikes.size > 0) {
    const { data: likedData } = await supabase
      .from('songs')
      .select('*')
      .in('id', Array.from(userLikes))
      .limit(20);
    likedTracksRaw = likedData || [];
  }

  // 4. Recommendations (Made For You)
  const recData = await getRecommendations(10, supabase, user?.id);
  const recTracks = recData || [];

  // 5. Fetch all genres for Playlists Section
  const { data: allSongs } = await supabase.from('songs').select('genre, cover_url');
  const genreCounts: Record<string, number> = {};
  const genreCovers: Record<string, string> = {};

  allSongs?.forEach((song: any) => {
    const genres = (song.genre || "").split(",").map((g: string) => g.trim());
    genres.forEach((g: string) => {
      if (g) {
        const normalizedGenre = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
        genreCounts[normalizedGenre] = (genreCounts[normalizedGenre] || 0) + 1;
        // Capture first valid cover for this genre
        if (!genreCovers[normalizedGenre] && song.cover_url) {
          genreCovers[normalizedGenre] = song.cover_url;
        }
      }
    });
  });
  const genrePlaylists = Object.entries(genreCounts).filter(([_, count]) => count >= 5);


  // Map to Track interface with isLiked
  const mapToTrack = (song: any) => ({
    id: song.id,
    name: song.title,
    artist_name: song.artist,
    image: song.cover_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`,
    audio: song.url,
    duration: song.duration || 180,
    shareurl: "",
    origin: song.origin,
    isLiked: userLikes.has(song.id)
  } as any);

  // Fallback for empty
  const isEmpty = !freshSongs?.length && !historyTracks.length && !likedTracksRaw.length;

  return (
    <div className="min-h-screen pb-32 bg-[#E8E4D9]">
      {/* Header removed: Replaced by Sidebar */}

      <main className="max-w-7xl mx-auto p-8 overflow-hidden">
        <div className="mb-12">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">
            Discover
          </h1>
          <div className="font-bold opacity-60 mb-8">Your vibe, uncensored.</div>

          <SearchComponent />
        </div>

        {/* Sections */}
        {likedTracksRaw.length > 0 && (
          <SectionRow title="Your Collection" tracks={likedTracksRaw.map(mapToTrack)} />
        )}

        <SectionRow title="Fresh Drops" tracks={(freshSongs || []).map(mapToTrack)} />

        <SectionRow title="Made For You" tracks={recTracks.map(mapToTrack)} />

        {/* Dynamic Vibe Playlists Section */}
        {genrePlaylists.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black uppercase italic mb-6">Vibe Playlists</h2>
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 scrollbar-hide snap-x">
              {genrePlaylists.map(([genre, count]) => (
                <a
                  key={genre}
                  href={`/playlist/${encodeURIComponent(genre)}?type=genre`}
                  className="flex-shrink-0 w-40 md:w-64 snap-start group"
                >
                  <div className="bg-black border-2 md:border-4 border-black aspect-square flex flex-col items-center justify-center p-4 md:p-6 shadow-[4px_4px_0px_0px_black] md:shadow-[8px_8px_0px_0px_black] group-hover:shadow-[2px_2px_0px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 transition-all relative overflow-hidden">
                    {/* Background Image */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity grayscale group-hover:grayscale-0"
                      style={{ backgroundImage: `url(${genreCovers[genre] || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000'})` }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                    <div className="absolute inset-0 bg-yellow-300 opacity-0 group-hover:opacity-10 transition-opacity mix-blend-overlay" />

                    <h3 className="text-lg md:text-2xl font-black uppercase text-center relative z-10 break-words w-full text-white italic tracking-tighter drop-shadow-lg">{genre}</h3>
                    <p className="font-bold text-white/80 relative z-10 text-xs md:text-sm mt-1">{count} Tracks</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {historyTracks.length > 0 && (
          <SectionRow title="History" tracks={historyTracks.map(mapToTrack)} />
        )}

        {/* Fallback */}
        {isEmpty && (
          <div className="text-center opacity-50 font-bold mt-20 p-12 border-4 border-dashed border-black/20">
            <p>It's quiet here...</p>
            <p>Upload a song to get the party started!</p>
          </div>
        )}
      </main>
    </div>
  );
}
