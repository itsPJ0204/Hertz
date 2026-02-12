import { createClient } from '@/lib/supabase/server';

interface MusicProfile {
    user_id: string;
    genre_vector: Record<string, number>;
    top_artists: { name: string }[];
}

export async function getSpotifyMatchScore(currentUserId: string, targetUserId: string): Promise<number> {
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
        .from('user_music_profiles')
        .select('user_id, genre_vector, top_artists')
        .in('user_id', [currentUserId, targetUserId]);

    if (error || !profiles || profiles.length !== 2) {
        console.error('Error fetching profiles for matching:', error);
        return 0;
    }

    const profileA = profiles.find(p => p.user_id === currentUserId);
    const profileB = profiles.find(p => p.user_id === targetUserId);

    if (!profileA || !profileB) return 0;

    const genreScore = calculateCosineSimilarity(profileA.genre_vector, profileB.genre_vector);

    // Calculate Artist Overlap (Jaccard for now)
    const artistsA = new Set((profileA.top_artists as any[]).map((a: any) => a.name));
    const artistsB = new Set((profileB.top_artists as any[]).map((a: any) => a.name));
    const artistScore = calculateJaccardIndex(artistsA, artistsB);

    // Weighted Score: 70% Genre, 30% Artist
    return (genreScore * 0.7) + (artistScore * 0.3);
}

function calculateCosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
    const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    keys.forEach(key => {
        const valA = vecA[key] || 0;
        const valB = vecB[key] || 0;
        dotProduct += valA * valB;
        magnitudeA += valA * valA;
        magnitudeB += valB * valB;
    });

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function calculateJaccardIndex(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

export interface SpotifyMatchedUser {
    user_id: string;
    match_score: number;
    common_genres: string[];
    common_artists: string[];
}

export async function findSpotifyMatches(currentUserId: string): Promise<SpotifyMatchedUser[]> {
    const supabase = await createClient();

    // Fetch current user's profile
    const { data: myProfile } = await supabase
        .from('user_music_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

    if (!myProfile) return [];

    // Fetch all other users' profiles
    // In production, use RPC or limit query
    const { data: otherProfiles } = await supabase
        .from('user_music_profiles')
        .select('*')
        .neq('user_id', currentUserId);

    if (!otherProfiles) return [];

    const matches: SpotifyMatchedUser[] = [];

    for (const other of otherProfiles) {
        const genreScore = calculateCosineSimilarity(myProfile.genre_vector, other.genre_vector);

        const myArtists = new Set((myProfile.top_artists as any[]).map((a: any) => a.name));
        const otherArtists = new Set((other.top_artists as any[]).map((a: any) => a.name));
        const artistScore = calculateJaccardIndex(myArtists, otherArtists);

        const totalScore = (genreScore * 0.7) + (artistScore * 0.3);

        if (totalScore > 0.1) { // Threshold
            // Find common genres
            const commonGenres = Object.keys(myProfile.genre_vector).filter(g => other.genre_vector[g]);
            // Find common artists
            const commonArtists = [...myArtists].filter(a => otherArtists.has(a as string)) as string[];

            matches.push({
                user_id: other.user_id,
                match_score: totalScore,
                common_genres: commonGenres.slice(0, 5),
                common_artists: commonArtists.slice(0, 5)
            });
        }
    }

    return matches.sort((a, b) => b.match_score - a.match_score);
}
