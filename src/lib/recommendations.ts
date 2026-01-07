import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface Song {
    id: string;
    genre: string | null;
    [key: string]: any;
}

export async function getRecommendations(limit = 5, supabaseClient?: SupabaseClient, userId?: string, excludeIds: string[] = []) {
    const supabase = supabaseClient || createClient();
    let currentUserId = userId;

    try {
        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            currentUserId = user?.id;
        }

        if (!currentUserId) return [];

        const { data: likes } = await supabase
            .from('likes')
            .select('songs(*)')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(1) as any;

        // Fetch a broad pool of songs
        const { data: allSongs } = await supabase.from('songs').select('*').limit(50);

        if (!allSongs) return [];

        let songsTyped = allSongs as Song[];

        // Filter out excluded IDs
        if (excludeIds.length > 0) {
            songsTyped = songsTyped.filter(s => !excludeIds.includes(s.external_id || s.id));
        }

        let filteredSongs = songsTyped;
        let lastGenre = '';

        if (likes && likes.length > 0) {
            lastGenre = likes[0].songs?.genre;
        }

        if (lastGenre) {
            const sameGenre = songsTyped.filter(s => s.genre && s.genre.includes(lastGenre));
            const otherGenre = songsTyped.filter(s => !s.genre || !s.genre.includes(lastGenre));

            // Shuffle both independently
            const shuffledSame = sameGenre.sort(() => 0.5 - Math.random());
            const shuffledOther = otherGenre.sort(() => 0.5 - Math.random());

            // Combine
            filteredSongs = [...shuffledSame, ...shuffledOther];
        } else {
            filteredSongs = songsTyped.sort(() => 0.5 - Math.random());
        }

        return filteredSongs.slice(0, limit);

    } catch (e) {
        console.error("Error fetching recommendations", e);
        return [];
    }
}
