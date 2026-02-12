import { createClient } from './supabase/server';

interface UserPreferences {
    genres: Set<string>;
    artists: Set<string>;
}

export async function getVibeMatchScore(userIdA: string, userIdB: string): Promise<number> {
    const supabase = await createClient();

    // Fetch history for both
    const [historyA, historyB] = await Promise.all([
        supabase.from('listening_history').select('songs(genre, artist)').eq('user_id', userIdA),
        supabase.from('listening_history').select('songs(genre, artist)').eq('user_id', userIdB)
    ]);

    if (historyA.error || historyB.error) {
        console.error('Error fetching history for matching:', historyA.error || historyB.error);
        return 0;
    }

    console.log(`[Matching] User A (${userIdA}) history count: ${historyA.data?.length || 0}`);
    console.log(`[Matching] User B (${userIdB}) history count: ${historyB.data?.length || 0}`);

    const prefsA = extractPreferences(historyA.data);
    const prefsB = extractPreferences(historyB.data);

    // Genre Weight: 70%, Artist Weight: 30%
    const genreScore = calculateJaccardIndex(prefsA.genres, prefsB.genres);
    const artistScore = calculateJaccardIndex(prefsA.artists, prefsB.artists);

    console.log(`[Matching] Scores - Genre: ${genreScore}, Artist: ${artistScore}`);

    const totalScore = (genreScore * 0.7) + (artistScore * 0.3);

    return parseFloat(totalScore.toFixed(2));
}

function extractPreferences(data: any[]): UserPreferences {
    const genres = new Set<string>();
    const artists = new Set<string>();

    data.forEach((item: any) => {
        if (item.songs?.genre) genres.add(item.songs.genre.toLowerCase());
        if (item.songs?.artist) artists.add(item.songs.artist.toLowerCase());
    });

    return { genres, artists };
}

function calculateJaccardIndex(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
}

export interface MatchedUser {
    id: string;
    name: string;
    avatar_url: string;
    matchScore: number;
    vibeScore?: number;
    spotifyScore?: number;
    sharedInterests: string[];
}

export async function getTopMatches(currentUserId: string): Promise<MatchedUser[]> {
    const supabase = await createClient();

    // 1. Get all other users
    const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(20);

    const users = usersData as any[] | null;

    if (!users) return [];

    const matches: MatchedUser[] = [];

    // 2. Calculate match score for each
    for (const user of users) {
        // Vibe Score (Listening History)
        const vibeScore = await getVibeMatchScore(currentUserId, user.id);

        // Spotify Score (Profile Data)
        const spotifyScore = await getSpotifyMatchScore(currentUserId, user.id);

        console.log(`[Matching] Comparing with ${user.full_name}: Vibe=${vibeScore}, Spotify=${spotifyScore}`);

        // Include if either score is relevant
        // For Spotify Matches, we want strict > 0.8 (80%)
        // For Vibe Matches, we keep the existing > 0.1 threshold

        if (vibeScore > 0.1 || spotifyScore > 0.1) {
            matches.push({
                id: user.id,
                name: user.full_name || 'Anonymous',
                avatar_url: user.avatar_url || '',
                matchScore: Math.round(Math.max(vibeScore, spotifyScore) * 100), // Use highest for generic display
                vibeScore: Math.round(vibeScore * 100),
                spotifyScore: Math.round(spotifyScore * 100),
                sharedInterests: ['Shared Vibe'] // detailed shared interests logic to be added
            });
        }
    }

    console.log(`[Matching] Found ${matches.length} matches for User ${currentUserId}`);
    // Sort by highest overall score
    return matches.sort((a, b) => Math.max(b.vibeScore || 0, b.spotifyScore || 0) - Math.max(a.vibeScore || 0, a.spotifyScore || 0));
}

export async function getSpotifyMatchScore(userIdA: string, userIdB: string): Promise<number> {
    const supabase = await createClient();

    const { data: profiles } = await supabase
        .from('user_music_profiles')
        .select('user_id, genre_vector, top_artists')
        .in('user_id', [userIdA, userIdB]);

    if (!profiles || profiles.length !== 2) return 0;

    const profileA = profiles.find(p => p.user_id === userIdA);
    const profileB = profiles.find(p => p.user_id === userIdB);

    if (!profileA || !profileB) return 0;

    // 1. Cosine Similarity for Genre Vectors
    const vecA = profileA.genre_vector || {};
    const vecB = profileB.genre_vector || {};

    const genres = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    genres.forEach(genre => {
        const valA = vecA[genre] || 0;
        const valB = vecB[genre] || 0;
        dotProduct += valA * valB;
        magnitudeA += valA * valA;
        magnitudeB += valB * valB;
    });

    const genreSimilarity = (magnitudeA && magnitudeB)
        ? dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
        : 0;

    // 2. Jaccard Index for Top Artists
    const artistsA = new Set((profileA.top_artists as any[])?.map(a => a.name) || []);
    const artistsB = new Set((profileB.top_artists as any[])?.map(a => a.name) || []);

    let artistSimilarity = 0;
    if (artistsA.size > 0 && artistsB.size > 0) {
        const intersection = new Set([...artistsA].filter(x => artistsB.has(x)));
        const union = new Set([...artistsA, ...artistsB]);
        artistSimilarity = intersection.size / union.size;
    }

    // Weighted Score: 60% Genre, 40% Artists
    return (genreSimilarity * 0.6) + (artistSimilarity * 0.4);
}
